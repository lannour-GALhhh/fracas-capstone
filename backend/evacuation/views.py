"""Evacuation-center API.

Reads are open to any authenticated client (the mobile app downloads the active
set as one GeoJSON FeatureCollection to compute the nearest center locally).
Writes are operator-only and edited straight from the GIS console; every write
is recorded in the unified POI audit log via the shared PoiViewSet base.
"""

from poi.views import PoiViewSet

from .models import EvacuationCenter
from .serializers import EvacuationCenterSerializer, EvacuationCenterWriteSerializer


class EvacuationCenterViewSet(PoiViewSet):
    queryset = EvacuationCenter.objects.select_related("barangay")
    read_serializer_class = EvacuationCenterSerializer
    write_serializer_class = EvacuationCenterWriteSerializer
    poi_type = "evacuation"
    tracked_fields = ["name", "capacity", "contact", "is_active"]


from rest_framework import status as http_status
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import log_change
from barangays.models import Barangay
from users.permissions import IsOperator

from .models import Evacuation, EvacuationCenter, EvacuationStatus
from .serializers import (
    EvacuationReportSerializer,
    EvacuationStatusSerializer,
    PingEvacuationSerializer,
)
from .services import lifecycle, snapshot


class EvacuationReportView(APIView):
    """A resident's device reports its own status transition. Upserts the one
    row for this (evacuation, user) — rows exist only for reporters — then warms
    the dashboard cache. 'Already outside the FSA' arrives here as a `safe`."""

    def post(self, request):
        serializer = EvacuationReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        active = Evacuation.objects.filter(status=Evacuation.Status.ACTIVE)
        if data.get("evacuation_id"):
            evac = active.filter(id=data["evacuation_id"]).first()
        else:
            evac = active.filter(barangay_id=data["barangay_id"]).first()
        if evac is None:
            return Response(
                {"detail": "No active evacuation for that barangay."},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        center = None
        if data.get("center_id"):
            center = EvacuationCenter.objects.filter(id=data["center_id"]).first()

        EvacuationStatus.objects.update_or_create(
            evacuation=evac,
            user=request.user,
            defaults={
                "status": data["status"],
                "resolved_via": data.get("resolved_via") or "",
                "center": center,
                "last_lat": data.get("lat"),
                "last_lng": data.get("lng"),
            },
        )
        snapshot.refresh()  # refresh-on-write keeps the shared aggregate warm
        return Response(
            {"evacuation_id": evac.id, "status": data["status"]},
            status=http_status.HTTP_200_OK,
        )


class ActiveEvacuationsView(APIView):
    """Cached dashboard aggregate for the operator console (one shared read)."""

    permission_classes = [IsOperator]

    def get(self, request):
        return Response(snapshot.get_dashboard())


class MyEvacuationsView(APIView):
    """Resident-facing: the active evacuations for the barangays this user is
    subscribed to, plus the user's own reported status. Drives the mobile
    evacuation banner and report flow.

    Deliberately slim — no roster or per-resident aggregate counts (those stay
    operator-only on ``active/``). A resident only ever learns about their own
    barangays and their own status, so this needs no extra permission gate
    beyond the default ``IsAuthenticated``.
    """

    def get(self, request):
        from users.models import Subscription

        barangay_ids = list(
            Subscription.objects.filter(user=request.user).values_list(
                "barangay_id", flat=True
            )
        )
        evacs = list(
            Evacuation.objects.filter(
                status=Evacuation.Status.ACTIVE, barangay_id__in=barangay_ids
            )
            .select_related("barangay")
            .order_by("-opened_at")
        )
        my_status = {
            s.evacuation_id: s.status
            for s in EvacuationStatus.objects.filter(
                evacuation__in=evacs, user=request.user
            ).only("evacuation_id", "status")
        }
        return Response(
            [
                {
                    "evacuation_id": e.id,
                    "barangay_id": e.barangay_id,
                    "barangay_name": e.barangay.name,
                    "trigger": e.trigger,
                    "opened_at": e.opened_at,
                    "my_status": my_status.get(e.id),
                }
                for e in evacs
            ]
        )


class EvacuationStatusesView(ListAPIView):
    """Paginated per-resident drill-down for one evacuation (operator, rare)."""

    permission_classes = [IsOperator]
    serializer_class = EvacuationStatusSerializer

    def get_queryset(self):
        return (
            EvacuationStatus.objects.filter(evacuation_id=self.kwargs["pk"])
            .select_related("user", "center")
            .order_by("-updated_at")
        )


class PingEvacuationView(APIView):
    """Operator ping: open an operator-triggered evacuation for a barangay,
    fire the evac push, and record the action for accountability."""

    permission_classes = [IsOperator]

    def post(self, request):
        serializer = PingEvacuationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barangay = get_object_or_404(Barangay, pk=serializer.validated_data["barangay_id"])

        evac, created = Evacuation.objects.get_or_create(
            barangay=barangay,
            status=Evacuation.Status.ACTIVE,
            defaults={
                "trigger": Evacuation.Trigger.OPERATOR,
                "triggered_by": request.user,
            },
        )
        if created:
            lifecycle.send_evac_push(barangay)
            log_change(
                request.user, "evacuation", action="pinged",
                field="barangay", new_value=f"{barangay.name} (#{barangay.id})",
            )
            snapshot.refresh()

        return Response(
            {"evacuation_id": evac.id, "created": created},
            status=http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK,
        )


class StandDownView(APIView):
    """Operator closes an evacuation. Freezes the final aggregate counts onto the
    row (the permanent record) so the per-resident rows can later be purged."""

    permission_classes = [IsOperator]

    def post(self, request, pk):
        evac = get_object_or_404(
            Evacuation.objects.select_related("barangay"),
            pk=pk, status=Evacuation.Status.ACTIVE,
        )
        lifecycle.stand_down(evac, actor=request.user)
        snapshot.refresh()
        return Response({"evacuation_id": evac.id, "status": evac.status})
