from django.urls import path
from rest_framework.routers import DefaultRouter

from .api_views import (
    AccountChangeListView,
    DeviceViewSet,
    NotificationPreferenceView,
    OperatorListView,
    RequestPhoneOTPView,
    SubscriptionViewSet,
    VerifyPhoneOTPView,
)

router = DefaultRouter()
router.register(r"account/subscriptions", SubscriptionViewSet, basename="subscription")
router.register(r"account/devices", DeviceViewSet, basename="device")

urlpatterns = [
    path("account/phone/otp/request/", RequestPhoneOTPView.as_view(), name="phone-otp-request"),
    path("account/phone/otp/verify/", VerifyPhoneOTPView.as_view(), name="phone-otp-verify"),
    path("account/preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("account/changes/", AccountChangeListView.as_view(), name="account-changes"),
    path("operators/", OperatorListView.as_view(), name="operator-list"),
] + router.urls
