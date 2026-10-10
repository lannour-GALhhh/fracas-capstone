"""Flood-history API. Reads are authenticated; writes are operator-only."""

from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from poi.views import is_operator_user
from users.permissions import IsAdmin, IsOperator

from .models import AutoDetectConfig, FloodEvent, FloodEventChange, FloodEventReport, ReportStatus
from .serializers import (
    AutoDetectConfigSerializer,
    FloodEventChangeSerializer,
    FloodEventDetailSerializer,
    FloodEventReportSerializer,
    FloodEventSerializer,
    FloodEventWriteSerializer,
    FloodReportReviewSerializer,
    FloodReportSubmitSerializer,
    MyFloodActivitySerializer,
)
from .services import changes, report_linking


class _OperatorWriteMixin:
    """Reads use the default (authenticated) permission; writes require operator."""

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return super().get_permissions()
        return [IsOperator()]


# Live events only (soft-deleted rows are hidden until purged / restored).
def _live_qs():
    return FloodEvent.objects.filter(
        deleted_at__isnull=True, archived_at__isnull=True
    ).select_related("barangay")


class FloodEventListView(_OperatorWriteMixin, ListCreateAPIView):
    def get_queryset(self):
        params = self.request.query_params
        # Archived events are hidden except in the operator archive view.
        if params.get("archived") == "true" and is_operator_user(self.request.user):
            queryset = FloodEvent.objects.filter(
                deleted_at__isnull=True, archived_at__isnull=False
            ).select_related("barangay")
        else:
            queryset = _live_qs()
        # Accepts one id or a comma-separated list (multi-select filter).
        ids = [b for b in (params.get("barangay") or "").split(",") if b.strip().isdigit()]
        if ids:
            queryset = queryset.filter(barangay_id__in=ids)
        if severity := params.get("severity"):
            queryset = queryset.filter(severity=severity)
        if params.get("confirmed") == "true":
            queryset = queryset.filter(is_confirmed=True)
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
    """The signed-in operator's own flood-event actions, newest first."""

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


class FloodEventArchiveView(_EventActionView):
    def post(self, request, pk):
        event = self.get_event(pk)
        if event.archived_at is None:
            event.archived_at = timezone.now()
            event.save(update_fields=["archived_at"])
            changes.log_action(event, FloodEventChange.Action.ARCHIVED, request.user)
        return self.detail_response(event)


class FloodEventRestoreView(_EventActionView):
    """Undo a soft-delete or an archive."""

    include_deleted = True

    def post(self, request, pk):
        event = self.get_event(pk)
        if event.deleted_at is not None or event.archived_at is not None:
            event.deleted_at = None
            event.archived_at = None
            event.save(update_fields=["deleted_at", "archived_at"])
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
    """Evidence reports (photos + narrative) for a flood event."""

    serializer_class = FloodEventReportSerializer

    def get_queryset(self):
        return (
            FloodEventReport.objects.filter(
                flood_event_id=self.kwargs["pk"], status=ReportStatus.VERIFIED
            )
            .select_related("reporter", "barangay", "reviewed_by")
            .prefetch_related("images")
        )

    def perform_create(self, serializer):
        event = get_object_or_404(FloodEvent, pk=self.kwargs["pk"])
        report = serializer.save(
            flood_event=event, barangay=event.barangay, reporter=self.request.user
        )
        changes.log_action(
            event,
            FloodEventChange.Action.UPDATED,
            self.request.user,
            field="report",
            new_value=f"Added evidence report ({report.images.count()} photo(s))",
        )


_REPORT_QS = FloodEventReport.objects.select_related(
    "reporter", "barangay", "reviewed_by"
).prefetch_related("images")

# Residents can't flood the review queue: cap submissions per rolling day.
MAX_SUBMISSIONS_PER_DAY = 20


class FloodReportListCreateView(ListCreateAPIView):
    """Resident photo reports. Operators see the whole queue; residents their own."""

    serializer_class = FloodReportSubmitSerializer

    def get_serializer_class(self):
        return FloodReportSubmitSerializer if self.request.method == "POST" else FloodEventReportSerializer

    def get_queryset(self):
        user, params = self.request.user, self.request.query_params
        queryset = _REPORT_QS.order_by("-created_at")
        if not is_operator_user(user):
            return queryset.filter(reporter=user)
        if (status_ := params.get("status")) in ReportStatus.values:
            queryset = queryset.filter(status=status_)
        ids = [b for b in (params.get("barangay") or "").split(",") if b.strip().isdigit()]
        if ids:
            queryset = queryset.filter(barangay_id__in=ids)
        if params.get("unlinked") == "true":
            queryset = queryset.filter(flood_event__isnull=True)
        # Date-sent range (inclusive), ISO date or datetime.
        if after := _parse_dt(params.get("sent_after")):
            queryset = queryset.filter(created_at__date__gte=after)
        if before := _parse_dt(params.get("sent_before")):
            queryset = queryset.filter(created_at__date__lte=before)
        return queryset

    def create(self, request, *args, **kwargs):
        since = timezone.now() - timedelta(days=1)
        if FloodEventReport.objects.filter(reporter=request.user, created_at__gte=since).count() >= MAX_SUBMISSIONS_PER_DAY:
            return Response(
                {"detail": "Daily report limit reached. Please try again tomorrow."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        data = serializer.validated_data
        barangay = data.get("barangay")
        if barangay is None:  # located by GPS
            barangay = report_linking.barangay_at(data["latitude"], data["longitude"])
            if barangay is None:
                raise ValidationError({"latitude": "That location isn't inside any Zamboanga City barangay."})
        event = report_linking.find_event(barangay.id, data["occurred_at"])
        report = serializer.save(
            barangay=barangay,
            flood_event=event,
            reporter=self.request.user,
            status=ReportStatus.PENDING,
        )
        serializer.instance = _REPORT_QS.get(pk=report.pk)


class FloodReportReviewView(APIView):
    """Operator verifies or rejects a report, optionally (re)linking it to an event."""

    permission_classes = [IsOperator]

    def post(self, request, pk):
        report = get_object_or_404(_REPORT_QS, pk=pk)
        form = FloodReportReviewSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data
        if "flood_event" in data:
            report.flood_event = data["flood_event"]
        if data["status"] == ReportStatus.VERIFIED and report.flood_event is None:
            raise ValidationError({"flood_event": "Link a flood event before verifying."})
        report.status = data["status"]
        report.review_note = data.get("review_note", report.review_note)
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()
        if report.status == ReportStatus.VERIFIED:
            changes.log_action(
                report.flood_event,
                FloodEventChange.Action.UPDATED,
                request.user,
                field="report",
                new_value=f"Verified resident report #{report.pk} ({report.images.count()} photo(s))",
            )
        return Response(FloodEventReportSerializer(report, context={"request": request}).data)
