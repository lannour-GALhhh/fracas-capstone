"""Health endpoints.

Liveness and readiness are unauthenticated so an orchestrator / uptime monitor
can probe them; they expose no sensitive data. The detailed status report
(includes ingestion internals) is admin-only.
"""

from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import health


class LivenessView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []  # probed frequently by orchestrators

    def get(self, request):
        return Response({"status": "ok"})


class ReadinessView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []  # probed frequently by orchestrators

    def get(self, request):
        ready, report = health.readiness()
        return Response(report, status=200 if ready else 503)


class StatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(health.status_report())
