"""Risk API: read-only risk views (authenticated) + admin config/validation runs."""

from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.generics import RetrieveAPIView, get_object_or_404
from users.permissions import IsAdmin
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from barangays.models import Barangay
from rainfall_fetch.models import Rainfall

from .models import RiskConfig, RiskScore, ValidationRun
from .serializers import BarangayRiskSerializer, RiskConfigSerializer, ValidationRunSerializer
from .services import snapshot
from .tasks import run_validation_task


class RiskSnapshotView(APIView):
    """Latest risk for every barangay — powers map coloring and risk cards."""

    def get(self, request):
        return Response(snapshot.latest())


class BarangayRiskView(RetrieveAPIView):
    """Full latest risk + rainfall detail for one barangay."""

    serializer_class = BarangayRiskSerializer

    def get_object(self):
        barangay = get_object_or_404(Barangay, pk=self.kwargs["pk"])
        score = (
            RiskScore.objects.filter(barangay=barangay).order_by("-computed_at").first()
        )
        rainfall = (
            Rainfall.objects.filter(barangay=barangay).order_by("-recorded_at").first()
        )
        return {"barangay": barangay, "score": score, "rainfall": rainfall}


class RiskConfigViewSet(ModelViewSet):
    """Admin-only CRUD over scoring configs, plus an activate action.

    No destroy — history of past configs stays around since `RiskScore.config`
    references them (audit trail of which config produced a given score).
    """

    queryset = RiskConfig.objects.all()
    serializer_class = RiskConfigSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        config = self.get_object()
        config.is_active = True
        config.save()
        return Response(self.get_serializer(config).data)


class ValidationRunViewSet(
    mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin, GenericViewSet
):
    """Admin-only: trigger a hindcast validation run (async) and poll results."""

    queryset = ValidationRun.objects.all()
    serializer_class = ValidationRunSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        run = serializer.save(created_by=self.request.user)
        run_validation_task.delay(run.id)
