"""Read-only flood-history API (authenticated)."""

from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import FloodEvent
from .serializers import FloodEventSerializer


class FloodEventListView(ListAPIView):
    serializer_class = FloodEventSerializer

    def get_queryset(self):
        queryset = FloodEvent.objects.select_related("barangay")
        barangay = self.request.query_params.get("barangay")
        return queryset.filter(barangay_id=barangay) if barangay else queryset


class FloodEventDetailView(RetrieveAPIView):
    queryset = FloodEvent.objects.select_related("barangay")
    serializer_class = FloodEventSerializer
