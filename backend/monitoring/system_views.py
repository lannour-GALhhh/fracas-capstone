"""Admin system-ops endpoints: status report + manual pipeline / retention runs."""

from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import log_change
from users.permissions import IsAdmin

from .services import ops


class SystemStatusView(APIView):
    """Full ops picture: readiness + ingestion + pipeline stages + cadence."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(ops.system_status())


class PipelineRunView(APIView):
    """Kick the ingest -> score -> evacuation pipeline off-cycle (async)."""

    permission_classes = [IsAdmin]

    def post(self, request):
        from risk_score.tasks import run_scoring_pipeline

        run_scoring_pipeline.delay()
        log_change(request.user, "System ops", action="pipeline_run")
        return Response({"detail": "Pipeline run queued."})


class RetentionRunView(APIView):
    """Run the retention cleanup off-cycle (async)."""

    permission_classes = [IsAdmin]

    def post(self, request):
        from monitoring.tasks import cleanup_old_data

        cleanup_old_data.delay()
        log_change(request.user, "System ops", action="retention_run")
        return Response({"detail": "Retention cleanup queued."})
