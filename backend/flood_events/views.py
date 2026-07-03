"""Flood-history API. Reads are authenticated; writes are operator-only."""

from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import SAFE_METHODS

from users.permissions import IsOperator

from .models import FloodEvent
from .serializers import (
    FloodEventDetailSerializer,
    FloodEventSerializer,
    FloodEventWriteSerializer,
)


class _OperatorWriteMixin:
    """Reads use the default (authenticated) permission; writes require operator."""

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return super().get_permissions()
        return [IsOperator()]


class FloodEventListView(_OperatorWriteMixin, ListCreateAPIView):
    def get_queryset(self):
        queryset = FloodEvent.objects.select_related("barangay")
        barangay = self.request.query_params.get("barangay")
        severity = self.request.query_params.get("severity")
        if barangay:
            queryset = queryset.filter(barangay_id=barangay)
        if severity:
            queryset = queryset.filter(severity=severity)
        return queryset

    def get_serializer_class(self):
        return FloodEventSerializer if self.request.method in SAFE_METHODS else FloodEventWriteSerializer


class FloodEventDetailView(_OperatorWriteMixin, RetrieveUpdateDestroyAPIView):
    # The detail serializer joins the response timeline + derives telemetry.
    queryset = FloodEvent.objects.select_related("barangay").prefetch_related("timeline")

    def get_serializer_class(self):
        return FloodEventDetailSerializer if self.request.method in SAFE_METHODS else FloodEventWriteSerializer
