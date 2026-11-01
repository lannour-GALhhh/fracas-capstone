"""Point + radius evacuation API."""

from django.db import transaction
from rest_framework import status as http_status
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsOperator
from poi.views import is_operator_user

from .models import RadiusEvacuation, RadiusEvacuationStatus
from .radius_serializers import (
    DeclareRadiusSerializer,
    RadiusReportSerializer,
    evac_geography,
)
from .services import radius as radius_service


class RadiusEvacuationsView(APIView):
    """GET active radius evacuations (all users); POST declares one (operator)."""

    def get_permissions(self):
        return [IsOperator()] if self.request.method == "POST" else super().get_permissions()

    def get(self, request):
        evacs = list(
            RadiusEvacuation.objects.filter(status=RadiusEvacuation.Status.ACTIVE).select_related("origin_barangay")
        )
        mine = dict(
            RadiusEvacuationStatus.objects.filter(evacuation__in=evacs, user=request.user)
            .values_list("evacuation_id", "status")
        )
        operator = is_operator_user(request.user)
        tallies = radius_service.counts([e.id for e in evacs]) if operator else {}
        rows = []
        for e in evacs:
            row = {**evac_geography(e), "my_status": mine.get(e.id)}
            if operator:  # aggregates stay operator-only, like zone evacuations
                row.update(tallies[e.id])
            rows.append(row)
        return Response(rows)

    def post(self, request):
        s = DeclareRadiusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        evac = radius_service.declare(
            lat=d["lat"], lng=d["lng"], radius_m=d["radius_m"],
            name=d.get("name", ""), actor=request.user,
        )
        return Response(
            {**evac_geography(evac), "my_status": None, "inside": 0, "safe": 0},
            status=http_status.HTTP_201_CREATED,
        )


class RadiusStandDownView(APIView):
    permission_classes = [IsOperator]

    def post(self, request, pk):
        evac = get_object_or_404(
            RadiusEvacuation, pk=pk, status=RadiusEvacuation.Status.ACTIVE
        )
        radius_service.stand_down(evac, actor=request.user)
        return Response({"evacuation_id": evac.id, "status": evac.status})


class RadiusReportView(APIView):
    """A resident's device reports it is inside the radius, or has left it."""

    @transaction.atomic
    def post(self, request):
        s = RadiusReportSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        evac = RadiusEvacuation.objects.filter(
            id=d["evacuation_id"], status=RadiusEvacuation.Status.ACTIVE
        ).first()
        if evac is None:
            return Response(
                {"detail": "No active radius evacuation with that id."},
                status=http_status.HTTP_404_NOT_FOUND,
            )
        current = RadiusEvacuationStatus.objects.filter(evacuation=evac, user=request.user).first()
        # "Evacuated" only counts for someone who was inside; "safe" is terminal.
        if d["status"] == "safe" and (current is None or current.status != "inside"):
            if current is None:
                return Response({"detail": "Not inside the radius."}, status=http_status.HTTP_409_CONFLICT)
            return Response({"evacuation_id": evac.id, "status": current.status})
        if current and current.status == "safe":
            return Response({"evacuation_id": evac.id, "status": "safe"})
        RadiusEvacuationStatus.objects.update_or_create(
            evacuation=evac, user=request.user,
            defaults={"status": d["status"], "last_lat": d.get("lat"), "last_lng": d.get("lng")},
        )
        return Response({"evacuation_id": evac.id, "status": d["status"]})


class RadiusHistoryView(ListAPIView):
    """Operator archive of stood-down radius evacuations, with their geography."""

    permission_classes = [IsOperator]

    def list(self, request, *args, **kwargs):
        qs = (
            RadiusEvacuation.objects.filter(status=RadiusEvacuation.Status.STOOD_DOWN)
            .select_related("origin_barangay")
            .order_by("-closed_at")[:100]
        )
        return Response(
            [
                {
                    **evac_geography(e),
                    "closed_at": e.closed_at,
                    "final_inside": e.final_inside,
                    "final_safe": e.final_safe,
                }
                for e in qs
            ]
        )
