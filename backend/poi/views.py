"""POI APIs: a reusable operator-editable + audited viewset base, and the
unified POI audit-log feed."""

from rest_framework import viewsets
from rest_framework.generics import ListAPIView
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

from users.permissions import IsOperator

from .models import MapPoiChange
from .serializers import MapPoiChangeSerializer
from .services import log_poi_change


def is_operator_user(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (user.is_operator or user.is_staff or user.is_superuser)
    )


class PoiViewSet(viewsets.ModelViewSet):
    """Base for map-POI resources edited from the GIS console.

    Reads are open to any authenticated client (mobile downloads the active set);
    writes are operator-only and every write is appended to the POI audit log.
    Subclasses set `queryset`, the read/write serializers, `poi_type` and the
    scalar `tracked_fields` diffed into the log.
    """

    read_serializer_class = None
    write_serializer_class = None
    poi_type: str = ""
    tracked_fields: list[str] = []
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        # Residents/mobile see only active POIs; operators managing the map see all.
        if not is_operator_user(self.request.user):
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return self.read_serializer_class
        return self.write_serializer_class

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsOperator()]

    # --- audit logging -----------------------------------------------------
    def _log(self, instance, action, *, detail=None):
        log_poi_change(
            editor=self.request.user,
            poi_type=self.poi_type,
            poi_id=instance.id,
            name=instance.name,
            action=action,
            location=instance.location,
            detail=detail,
        )

    def perform_create(self, serializer):
        self._log(serializer.save(), "created")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        before = {f: getattr(instance, f) for f in self.tracked_fields}
        before_loc = instance.location.tuple if instance.location else None

        response = super().update(request, *args, **kwargs)

        instance.refresh_from_db()
        after_loc = instance.location.tuple if instance.location else None
        changed = {
            f: [before[f], getattr(instance, f)]
            for f in self.tracked_fields
            if before[f] != getattr(instance, f)
        }
        moved = after_loc != before_loc
        action = "moved" if moved and not changed else "updated"
        self._log(instance, action, detail={"changed": changed, "moved": moved})
        return response

    def perform_destroy(self, instance):
        self._log(instance, "deleted")
        instance.delete()


class PoiChangeLogView(ListAPIView):
    """The 'when / where / what' feed of every POI edit, newest first.

    Filter with `?poi_type=evacuation|hotspot` and `?poi_id=<n>`.
    """

    serializer_class = MapPoiChangeSerializer
    permission_classes = [IsOperator]

    def get_queryset(self):
        qs = MapPoiChange.objects.select_related("editor")
        params = self.request.query_params
        if poi_type := params.get("poi_type"):
            qs = qs.filter(poi_type=poi_type)
        if poi_id := params.get("poi_id"):
            qs = qs.filter(poi_id=poi_id)
        return qs
