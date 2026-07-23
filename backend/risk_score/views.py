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


class RiskZonesSnapshotView(APIView):
    """Latest per-zone (barangay x susceptibility level) risk — colors the hazard-zone layer."""

    def get(self, request):
        return Response(snapshot.zones_latest())


class LocalizedRiskView(APIView):
    """Pinpoint flood risk for a lat/lng (mobile).

    Resolves the resident's exact susceptibility zone by point-in-polygon and
    returns that zone's localized score, alongside the containing barangay's
    per-zone scores and headline average.
    """

    def get(self, request):
        from django.contrib.gis.geos import Point

        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "lat and lng query params are required."}, status=400)

        point = Point(lng, lat, srid=4326)
        barangay = Barangay.objects.filter(boundary__contains=point).first()
        if barangay is None:
            return Response({"detail": "Point is outside all barangay boundaries."}, status=404)

        score = RiskScore.objects.filter(barangay=barangay).order_by("-computed_at").first()
        zones = (score.breakdown or {}).get("zones", []) if score else []

        from barangays.models import BarangaySusceptibility

        hit = (
            BarangaySusceptibility.objects.filter(barangay=barangay, geom__contains=point)
            .order_by("-source_flood_value")
            .first()
        )
        local_level = hit.level if hit else None
        local_zone = next((z for z in zones if z["level"] == local_level), None)

        return Response(
            {
                "barangay": {"id": barangay.id, "name": barangay.name},
                "average": round(score.score, 2) if score else None,
                "status": score.category if score else None,
                "is_degraded": score.is_degraded if score else None,
                "computed_at": score.computed_at.isoformat() if score else None,
                "localized": local_zone,  # None if the point isn't inside a mapped zone
                "zones": zones,
            }
        )


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
        from audit.services import log_change

        config = self.get_object()
        config.is_active = True
        config.save()
        log_change(
            request.user, "risk-config",
            action="activated", field="active_config", new_value=f"{config.name} (#{config.pk})",
        )
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
