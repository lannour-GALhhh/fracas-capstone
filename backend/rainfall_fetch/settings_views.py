"""Rainfall settings endpoint (admin): picks the Open-Meteo weather model."""

from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.serializers import SingletonSerializer
from audit.services import log_change
from audit.views import SingletonSettingsView
from users.permissions import IsAdmin

from .models import RainfallSettings
from .services.grid import ensure_grid_mapping, grid_status
from .services.model_switch import apply_model_change


class RainfallSettingsSerializer(SingletonSerializer):
    class Meta:
        model = RainfallSettings
        fields = ["weather_model", "updated_at"]
        read_only_fields = ["updated_at"]


class RainfallSettingsView(SingletonSettingsView):
    model = RainfallSettings
    serializer_class = RainfallSettingsSerializer
    target_label = "Rainfall settings"

    def perform_update(self, serializer):
        previous = serializer.instance.weather_model
        super().perform_update(serializer)
        if serializer.instance.weather_model != previous:
            transaction.on_commit(apply_model_change)


class RainfallGridView(APIView):
    """GET: how well barangays dedup into Open-Meteo cells. POST: re-map every barangay now."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(grid_status())

    def post(self, request):
        mapped, failed = ensure_grid_mapping(remap=True)
        log_change(request.user, "Rainfall settings", action="remapped grid", new_value=f"{mapped} mapped")
        return Response({**grid_status(), "failed": [b.name for b in failed]})
