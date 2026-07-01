"""Read-only dam status API (authenticated)."""

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dam


class DamStatusView(APIView):
    """Latest Pasonanca reading + thresholds for the dam-status widget."""

    def get(self, request):
        dam = Dam.objects.first()
        if dam is None:
            return Response({"has_data": False})

        reading = dam.readings.first()  # latest (Meta ordering)
        data = {
            "dam": dam.name,
            "normal_level": dam.normal_level,
            "critical_level": dam.critical_level,
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
                }
            )
        return Response(data)
