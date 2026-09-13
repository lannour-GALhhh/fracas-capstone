from rest_framework import viewsets

from .models import Rainfall
from .serializers import RainfallSerializer


class RainfallViewset(viewsets.ReadOnlyModelViewSet):
    """Read-only access to machine-generated rainfall readings.

    Ordering comes from Rainfall.Meta (-recorded_at). Optionally filter to
    one barangay's history with `?barangay=<id>`.
    """

    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        barangay_id = self.request.query_params.get("barangay")
        if barangay_id:
            qs = qs.filter(barangay_id=barangay_id)
        return qs
