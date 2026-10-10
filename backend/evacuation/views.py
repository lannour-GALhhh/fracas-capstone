"""Evacuation-center API."""

from django.db.models import Max
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from poi.views import PoiViewSet, is_operator_user
from users.permissions import IsOperator

from .models import EvacuationCenter, EvacuationCenterImage
from .serializers import (
    CenterImageSerializer,
    EvacuationCenterSerializer,
    EvacuationCenterWriteSerializer,
)


class EvacuationCenterViewSet(PoiViewSet):
    queryset = EvacuationCenter.objects.select_related("barangay").prefetch_related(
        "contacts", "images"
    )
    read_serializer_class = EvacuationCenterSerializer
    write_serializer_class = EvacuationCenterWriteSerializer
    poi_type = "evacuation"
    tracked_fields = ["name", "capacity", "capacity_unit", "is_active"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Archived centers are hidden everywhere except the operator archive view
        # (`?archived=true`) and the restore action.
        want_archived = self.action == "restore" or (
            self.request.query_params.get("archived") == "true"
            and is_operator_user(self.request.user)
        )
        return qs.filter(archived_at__isnull=not want_archived)

    def perform_destroy(self, instance):
        """'Delete' archives; the purge task hard-deletes after the grace period."""
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])
        self._log(instance, "archived")

    @action(detail=True, methods=["post"], permission_classes=[IsOperator])
    def restore(self, request, pk=None):
        center = self.get_object()
        center.archived_at = None
        center.save(update_fields=["archived_at"])
        self._log(center, "restored")
        return Response(
            EvacuationCenterSerializer(center, context={"request": request}).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsOperator],
    )
    def add_images(self, request, pk=None):
        """Attach one or more photos (multipart `images` files) to a center."""
        center = self.get_object()
        files = request.FILES.getlist("images")
        if not files:
            return Response({"images": ["Attach at least one image."]}, status=400)
        created = []
        next_pos = (center.images.aggregate(m=Max("position"))["m"] or -1) + 1
        for offset, f in enumerate(files):
            serializer = CenterImageSerializer(data={"image": f}, context={"request": request})
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save(center=center, position=next_pos + offset))
        self._log(center, "updated", detail={"changed": {"images": [None, f"+{len(created)}"]}})
        return Response(
            CenterImageSerializer(created, many=True, context={"request": request}).data,
            status=201,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="images/reorder",
        permission_classes=[IsOperator],
    )
    def reorder_images(self, request, pk=None):
        """Set photo order from `ids` (first = MAIN). Must list every photo of the center."""
        center = self.get_object()
        ids = request.data.get("ids")
        existing = set(center.images.values_list("id", flat=True))
        if not isinstance(ids, list) or set(ids) != existing or len(ids) != len(existing):
            return Response({"ids": ["Provide every image id of this center exactly once."]}, status=400)
        for position, image_id in enumerate(ids):
            center.images.filter(id=image_id).update(position=position)
        self._log(center, "updated", detail={"changed": {"images": [None, "reordered"]}})
        return Response(status=204)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>\d+)",
        permission_classes=[IsOperator],
    )
    def remove_image(self, request, pk=None, image_id=None):
        center = self.get_object()
        image = get_object_or_404(EvacuationCenterImage, pk=image_id, center=center)
        image.image.delete(save=False)  # drop the file from storage too
        image.delete()
        self._log(center, "updated", detail={"changed": {"images": [None, "-1"]}})
        return Response(status=204)


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
from .services import zones as zone_service


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
                    "zones": e.zones,
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
        ids = [b for b in (params.get("barangay") or "").split(",") if b.strip().isdigit()]
        if ids:
            queryset = queryset.filter(barangay_id__in=ids)
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

        zones = zone_service.resolve(barangay, serializer.validated_data.get("zones"))
        if zones is None:
            return Response(
                {"zones": ["One or more zones don't exist in this barangay."]},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        if not zones:
            # Nothing in this barangay scores High or Critical right now.
            return Response(
                {"evacuation_id": None, "created": False, "skipped": True},
                status=http_status.HTTP_200_OK,
            )

        evac, created = Evacuation.objects.get_or_create(
            barangay=barangay,
            status=Evacuation.Status.ACTIVE,
            defaults={
                "trigger": Evacuation.Trigger.OPERATOR,
                "triggered_by": request.user,
                "zones": zones,
            },
        )
        if created:
            lifecycle.send_evac_push(barangay, zones)
            log_change(
                request.user, "evacuation", action="pinged",
                field="barangay",
                new_value=f"{barangay.name} (#{barangay.id}): "
                + ", ".join(z["level"] for z in zones),
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
