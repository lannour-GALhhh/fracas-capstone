"""Secret-protected endpoints pinged by the external cron service."""

import hmac

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import cron

CRON_KEY_HEADER = "X-Cron-Key"


class CronJobView(APIView):
    authentication_classes: list = []
    permission_classes: list = []  # auth is the shared secret, checked below
    throttle_classes: list = []

    def post(self, request, job):
        secret = settings.CRON_SECRET
        if not secret:  # unset -> endpoints disabled, never open
            return Response(status=status.HTTP_404_NOT_FOUND)
        supplied = request.headers.get(CRON_KEY_HEADER, "")
        if not hmac.compare_digest(supplied.encode(), secret.encode()):
            return Response(status=status.HTTP_403_FORBIDDEN)
        if job not in cron.JOBS:
            return Response(status=status.HTTP_404_NOT_FOUND)
        outcome = cron.trigger(job)
        code = (
            status.HTTP_202_ACCEPTED
            if outcome == cron.STARTED
            else status.HTTP_200_OK
        )
        return Response({"job": job, "status": outcome}, status=code)
