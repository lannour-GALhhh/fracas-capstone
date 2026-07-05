from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers_jwt import RoleTokenObtainPairSerializer


def _is_mobile(request) -> bool:
    """React Native can't hold an HttpOnly refresh cookie, so mobile clients send
    ``X-Client: mobile`` and get/return the refresh token in the body instead."""
    return request.headers.get("X-Client", "").lower() == "mobile"


def _set_refresh_cookie(response):
    response.set_cookie(
        key=settings.SIMPLE_JWT["AUTH_COOKIE"],
        value=response.data["refresh"],
        httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
        secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
        samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleTokenObtainPairSerializer

    def finalize_response(self, request, response, *args, **kwargs):
        # Web: refresh → HttpOnly cookie, stripped from the body.
        # Mobile: refresh stays in the body (stored in expo-secure-store).
        if response.data.get("refresh") and not _is_mobile(request):
            _set_refresh_cookie(response)
            del response.data["refresh"]

        return super().finalize_response(request, response, *args, **kwargs)


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Prefer the HttpOnly cookie (web); fall back to a body-supplied refresh
        # token (mobile) so React Native clients can refresh without cookies.
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE"]) or request.data.get(
            "refresh"
        )

        if not refresh_token:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        request.data["refresh"] = refresh_token
        return super().post(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        if response.data.get("refresh") and not _is_mobile(request):
            _set_refresh_cookie(response)
            del response.data["refresh"]

        return super().finalize_response(request, response, *args, **kwargs)
