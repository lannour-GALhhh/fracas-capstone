"""Read-only risk API (authenticated)."""

from rest_framework.generics import RetrieveAPIView, get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from barangays.models import Barangay
from rainfall_fetch.models import Rainfall

from .models import RiskScore
from .serializers import BarangayRiskSerializer
from .services import snapshot


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
