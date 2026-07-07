"""Read-only dam status + geometry API (authenticated)."""

import json
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dam

# How much recent water-level history the status widget draws as a trend
# sparkline. At the 15-min pipeline cadence this is ~96 points — cheap to send
# and enough to read the direction the dam is moving at a glance.
HISTORY_HOURS = 24


class DamStatusView(APIView):
    """Latest Pasonanca reading + thresholds + recent trend for the widget."""

    def get(self, request):
        dam = Dam.objects.first()
        if dam is None:
            return Response({"has_data": False})

        reading = dam.readings.first()  # latest (Meta ordering)
        data = {
            "dam": dam.name,
            "normal_level": dam.normal_level,
            "critical_level": dam.critical_level,
            "influence_radius_km": dam.influence_radius_km,
            "location": list(dam.location.coords) if dam.location else None,
            "has_data": reading is not None,
        }
        if reading is not None:
            data.update(
                {
                    "current_level": reading.water_level,
                    "rate_of_change": reading.rate_of_change,
                    "is_spilling": reading.is_spilling,
                    "turbidity": reading.turbidity,
                    "recorded_at": reading.recorded_at.isoformat(),
                    "history": self._recent_history(dam),
                }
            )
        return Response(data)

    @staticmethod
    def _recent_history(dam):
        """Last `HISTORY_HOURS` of readings, oldest→newest, for the sparkline."""
        since = timezone.now() - timedelta(hours=HISTORY_HOURS)
        rows = (
            dam.readings.filter(recorded_at__gte=since)
            .order_by("recorded_at")
            .values("recorded_at", "water_level", "rate_of_change", "is_spilling")
        )
        return [
            {
                "recorded_at": r["recorded_at"].isoformat(),
                "water_level": r["water_level"],
                "rate_of_change": r["rate_of_change"],
                "is_spilling": r["is_spilling"],
            }
            for r in rows
        ]


class DamGeoView(APIView):
    """The dam point + river corridor as a GeoJSON FeatureCollection for the map."""

    def get(self, request):
        features = []
        for dam in Dam.objects.exclude(location__isnull=True):
            features.append(
                {
                    "type": "Feature",
                    "geometry": json.loads(dam.location.geojson),
                    "properties": {
                        "id": dam.id,
                        "name": dam.name,
                        "kind": "dam",
                        "influence_radius_km": dam.influence_radius_km,
                    },
                }
            )
            if dam.river is not None:
                features.append(
                    {
                        "type": "Feature",
                        "geometry": json.loads(dam.river.geojson),
                        "properties": {"id": dam.id, "name": dam.name, "kind": "river"},
                    }
                )
        return Response({"type": "FeatureCollection", "features": features})
