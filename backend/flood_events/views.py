"""Flood-history API. Reads are authenticated; writes are operator-only."""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin, IsOperator

from .models import AutoDetectConfig, FloodEvent, FloodEventChange, FloodEventReport
from .serializers import (
    AutoDetectConfigSerializer,
    FloodEventChangeSerializer,
    FloodEventDetailSerializer,
    FloodEventReportSerializer,
    FloodEventSerializer,
    FloodEventWriteSerializer,
    MyFloodActivitySerializer,
)
from .services import changes


class _OperatorWriteMixin:
    """Reads use the default (authenticated) permission; writes require operator."""

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return super().get_permissions()
        return [IsOperator()]


# Live events only (soft-deleted rows are hidden until purged / restored).
def _live_qs():
    return FloodEvent.objects.filter(deleted_at__isnull=True).select_related("barangay")


class FloodEventListView(_OperatorWriteMixin, ListCreateAPIView):
    def get_queryset(self):
        queryset = _live_qs()
        params = self.request.query_params
        if barangay := params.get("barangay"):
            queryset = queryset.filter(barangay_id=barangay)
        if severity := params.get("severity"):
            queryset = queryset.filter(severity=severity)
        # Date-range filter (inclusive), accepts ISO date or datetime.
        if after := _parse_dt(params.get("occurred_after")):
            queryset = queryset.filter(occurred_at__date__gte=after)
        if before := _parse_dt(params.get("occurred_before")):
            queryset = queryset.filter(occurred_at__date__lte=before)
        return queryset

    def get_serializer_class(self):
        return FloodEventSerializer if self.request.method in SAFE_METHODS else FloodEventWriteSerializer


class FloodEventDetailView(_OperatorWriteMixin, RetrieveUpdateDestroyAPIView):
    queryset = _live_qs().prefetch_related("timeline")

    def get_serializer_class(self):
        return FloodEventDetailSerializer if self.request.method in SAFE_METHODS else FloodEventWriteSerializer

    def perform_destroy(self, instance):
        # Soft delete: hide now, hard-purge later (undo window).
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        changes.log_action(instance, FloodEventChange.Action.DELETED, self.request.user)


class FloodEventChangesView(ListAPIView):
    """Append-only audit trail for one event."""

    serializer_class = FloodEventChangeSerializer
    pagination_class = None

    def get_queryset(self):
        return FloodEventChange.objects.filter(
            flood_event_id=self.kwargs["pk"]
        ).select_related("editor")


class MyFloodActivityView(ListAPIView):
    """The signed-in operator's own flood-event actions, newest first.

    Powers the account page's activity feed. Scoped to `request.user`, so an
    operator only ever sees the changes they made.
    """

    permission_classes = [IsOperator]
    serializer_class = MyFloodActivitySerializer

    def get_queryset(self):
        return FloodEventChange.objects.filter(
            editor=self.request.user
        ).select_related("flood_event", "flood_event__barangay")


class _EventActionView(APIView):
    """Base for operator lifecycle actions on a single event."""

    permission_classes = [IsOperator]
    include_deleted = False

    def get_event(self, pk):
        qs = FloodEvent.objects if self.include_deleted else FloodEvent.objects.filter(
            deleted_at__isnull=True
        )
        return get_object_or_404(qs, pk=pk)

    def detail_response(self, event):
        event = FloodEvent.objects.select_related("barangay").prefetch_related("timeline").get(pk=event.pk)
        return Response(FloodEventDetailSerializer(event, context={"request": self.request}).data)


class FloodEventConfirmView(_EventActionView):
    def post(self, request, pk):
        event = self.get_event(pk)
        if not event.is_confirmed:
            event.is_confirmed = True
            event.confirmed_by = request.user
            event.confirmed_at = timezone.now()
            event.save(update_fields=["is_confirmed", "confirmed_by", "confirmed_at"])
            changes.log_action(event, FloodEventChange.Action.CONFIRMED, request.user)
        return self.detail_response(event)


class FloodEventResolveView(_EventActionView):
    def post(self, request, pk):
        event = self.get_event(pk)
        ended_at = parse_datetime(str(request.data.get("ended_at", "")))
        if ended_at is None:
            return Response({"ended_at": "A valid datetime is required."}, status=status.HTTP_400_BAD_REQUEST)
        if ended_at < event.occurred_at:
            return Response({"ended_at": "Must be at or after occurred_at."}, status=status.HTTP_400_BAD_REQUEST)
        old = event.ended_at
        event.ended_at = ended_at
        event.save(update_fields=["ended_at"])
        changes.log_action(
            event,
            FloodEventChange.Action.RESOLVED,
            request.user,
            field="ended_at",
            old_value="" if old is None else str(old),
            new_value=str(ended_at),
        )
        return self.detail_response(event)


class FloodEventRestoreView(_EventActionView):
    include_deleted = True

    def post(self, request, pk):
        event = self.get_event(pk)
        if event.deleted_at is not None:
            event.deleted_at = None
            event.save(update_fields=["deleted_at"])
            changes.log_action(event, FloodEventChange.Action.RESTORED, request.user)
        return self.detail_response(event)


class AutoDetectConfigView(RetrieveUpdateAPIView):
    """Read/update the auto-detection singleton (admin-only)."""

    permission_classes = [IsAdmin]
    serializer_class = AutoDetectConfigSerializer

    def get_object(self):
        return AutoDetectConfig.get_solo()


def _parse_dt(raw):
    """Parse an ISO date or datetime query param into a date, or None."""
    if not raw:
        return None
    dt = parse_datetime(raw)
    if dt is not None:
        return dt.date()
    return parse_date(raw)


class FloodEventReportsView(_OperatorWriteMixin, ListCreateAPIView):
    """Evidence reports (photos + narrative) for a flood event.

    Reads: any authenticated user. Create: operator — the reporter is the signed-
    in user, and the report is recorded on the event's audit trail.
    """

    serializer_class = FloodEventReportSerializer

    def get_queryset(self):
        return (
            FloodEventReport.objects.filter(flood_event_id=self.kwargs["pk"])
            .select_related("reporter")
            .prefetch_related("images")
        )

    def perform_create(self, serializer):
        event = get_object_or_404(FloodEvent, pk=self.kwargs["pk"])
        report = serializer.save(flood_event=event, reporter=self.request.user)
        changes.log_action(
            event,
            FloodEventChange.Action.UPDATED,
            self.request.user,
            field="report",
            new_value=f"Added evidence report ({report.images.count()} photo(s))",
        )
