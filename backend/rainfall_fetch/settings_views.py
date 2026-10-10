"""Rainfall settings endpoint (admin): picks the Open-Meteo weather model."""

from django.db import transaction

from audit.serializers import SingletonSerializer
from audit.views import SingletonSettingsView

from .models import RainfallSettings
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
