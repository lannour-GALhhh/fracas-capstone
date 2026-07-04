"""User-facing in-app notifications feed (authenticated) + operator broadcast."""

from uuid import uuid4

from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from risk_score.constants import RiskCategory
from users.permissions import IsOperator

from .constants import EventKind, EventSource
from .models import AlertEvent, Notification
from .serializers import (
    AlertEventSerializer,
    BroadcastSerializer,
    NotificationSerializer,
)
from .services.dispatcher import broadcast


class NotificationViewSet(mixins.ListModelMixin, GenericViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("barangay")

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"detail": "Marked read."})

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": f"Marked {updated} read."})


class BroadcastView(APIView):
    """Operator action: push a custom advisory to a barangay's subscribers."""

    permission_classes = [IsOperator]

    def post(self, request):
        serializer = BroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        barangay = data["barangay"]
        title = data.get("title") or f"Advisory: {barangay.name}"
        dispatch_key = f"broadcast:{barangay.id}:{uuid4().hex}"
        recipients = broadcast(barangay, title, data["message"], dispatch_key)
        AlertEvent.objects.create(
            barangay=barangay,
            level=RiskCategory.CRITICAL,
            kind=EventKind.BROADCAST,
            source=EventSource.OPERATOR,
            recipients=recipients,
            triggered_by=request.user,
            dispatch_key=dispatch_key,
        )
        return Response(
            {"recipients": recipients, "dispatch_key": dispatch_key},
            status=status.HTTP_201_CREATED,
        )


class AlertEventListView(mixins.ListModelMixin, GenericViewSet):
    """Operator audit log: system-wide history of alert transitions.

    Read-only and filterable by `barangay`, `source`, and `kind`, plus
    `triggered_by=me` to scope the log to the requesting operator's own
    broadcasts. Distinct from the per-user `NotificationViewSet` feed — this is
    every episode, including zero-recipient and suppressed ones.
    """

    permission_classes = [IsOperator]
    serializer_class = AlertEventSerializer

    def get_queryset(self):
        qs = AlertEvent.objects.select_related("barangay", "triggered_by")
        params = self.request.query_params
        for field in ("barangay", "source", "kind"):
            value = params.get(field)
            if value:
                qs = qs.filter(**{field: value})
        if params.get("triggered_by") == "me":
            qs = qs.filter(triggered_by=self.request.user)
        return qs
