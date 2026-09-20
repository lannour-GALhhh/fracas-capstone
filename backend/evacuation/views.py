"""Evacuation-center API."""

from poi.views import PoiViewSet

from .models import EvacuationCenter
from .serializers import EvacuationCenterSerializer, EvacuationCenterWriteSerializer


class EvacuationCenterViewSet(PoiViewSet):
    queryset = EvacuationCenter.objects.select_related("barangay")
    read_serializer_class = EvacuationCenterSerializer
    write_serializer_class = EvacuationCenterWriteSerializer
    poi_type = "evacuation"
    tracked_fields = ["name", "capacity", "contact", "is_active"]


from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status as http_status
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import log_change
from barangays.models import Barangay
from users.permissions import IsOperator

from .models import Evacuation, EvacuationCenter, EvacuationStatus
from .serializers import (
    EvacuationHistorySerializer,
    EvacuationReportSerializer,
    EvacuationStatusSerializer,
    PingEvacuationSerializer,
)
from .services import lifecycle, snapshot


class EvacuationReportView(APIView):
    """A resident's device reports its own status transition."""

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
    """Resident-facing: the active evacuations for the barangays this user follows."""

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


def _parse_day(raw):
    """Parse an ISO date or datetime query param into a date, or None."""
    if not raw:
        return None
    dt = parse_datetime(raw)
    if dt is not None:
        return dt.date()
    return parse_date(raw)


class EvacuationHistoryView(ListAPIView):
    """Operator archive: every evacuation that has been stood down."""

    permission_classes = [IsOperator]
    serializer_class = EvacuationHistorySerializer

    def get_queryset(self):
        queryset = Evacuation.objects.filter(
            status=Evacuation.Status.STOOD_DOWN
        ).select_related("barangay", "triggered_by")
        params = self.request.query_params
        if barangay := params.get("barangay"):
            queryset = queryset.filter(barangay_id=barangay)
        if trigger := params.get("trigger"):
            queryset = queryset.filter(trigger=trigger)
        if after := _parse_day(params.get("closed_after")):
            queryset = queryset.filter(closed_at__date__gte=after)
        if before := _parse_day(params.get("closed_before")):
            queryset = queryset.filter(closed_at__date__lte=before)
        # Newest stand-down first (the model's default ordering is by opening).
        return queryset.order_by("-closed_at", "-opened_at")


class PingEvacuationView(APIView):
    """Operator ping: open an operator-triggered evacuation for a barangay."""

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
    """Operator closes an evacuation and freezes the final aggregate counts."""

    permission_classes = [IsOperator]

    def post(self, request, pk):
        evac = get_object_or_404(
            Evacuation.objects.select_related("barangay"),
            pk=pk, status=Evacuation.Status.ACTIVE,
        )
        lifecycle.stand_down(evac, actor=request.user)
        snapshot.refresh()
        return Response({"evacuation_id": evac.id, "status": evac.status})
