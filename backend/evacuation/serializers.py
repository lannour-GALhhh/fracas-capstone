from django.contrib.gis.geos import Point
from django.db import transaction
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from barangays.models import Barangay

from .models import (
    Evacuation,
    EvacuationCenter,
    EvacuationCenterContact,
    EvacuationCenterImage,
    EvacuationStatus,
)


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvacuationCenterContact
        fields = ["id", "label", "phone"]
        read_only_fields = ["id"]


class CenterImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvacuationCenterImage
        fields = ["id", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class EvacuationCenterSerializer(GeoFeatureModelSerializer):
    """GeoJSON read representation (also what the mobile app downloads)."""

    # Method field so a null barangay serializes as None, not SkipField.
    barangay_name = serializers.SerializerMethodField()
    contacts = ContactSerializer(many=True, read_only=True)
    images = CenterImageSerializer(many=True, read_only=True)
    # First contact's number: the single `contact` string older clients (mobile) dial.
    contact = serializers.SerializerMethodField()

    def get_barangay_name(self, obj):
        return obj.barangay.name if obj.barangay_id else None

    def get_contact(self, obj):
        # Iterates the prefetched list rather than issuing a query per center.
        contacts = list(obj.contacts.all())
        return contacts[0].phone if contacts else ""

    class Meta:
        model = EvacuationCenter
        geo_field = "location"
        # Keep `id` in properties (see BarangayListSerializer for the rationale).
        id_field = False
        fields = [
            "id", "name", "capacity", "contact", "contacts", "images",
            "is_active", "barangay", "barangay_name", "archived_at",
        ]


class EvacuationCenterWriteSerializer(serializers.ModelSerializer):
    """Operator write form: plain lat/lng in, GeoJSON Feature back out.

    `contacts`, when sent, replaces the center's whole contact list. Photos are
    managed through the `images/` sub-resource (multipart), not this payload.
    """

    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)
    contacts = ContactSerializer(many=True, required=False)

    class Meta:
        model = EvacuationCenter
        fields = ["id", "name", "capacity", "contacts", "is_active", "barangay", "latitude", "longitude"]

    def _apply_location(self, validated):
        lat = validated.pop("latitude", None)
        lng = validated.pop("longitude", None)
        point = Point(lng, lat, srid=4326) if lat is not None and lng is not None else None
        if point is not None:
            validated["location"] = point
            # Auto-resolve the containing barangay unless one was supplied.
            if not validated.get("barangay"):
                validated["barangay"] = Barangay.objects.filter(boundary__contains=point).first()
        return validated

    @staticmethod
    def _replace_contacts(center, contacts):
        center.contacts.all().delete()
        EvacuationCenterContact.objects.bulk_create(
            [EvacuationCenterContact(center=center, **c) for c in contacts]
        )

    @transaction.atomic
    def create(self, validated_data):
        contacts = validated_data.pop("contacts", [])
        center = super().create(self._apply_location(validated_data))
        self._replace_contacts(center, contacts)
        return center

    @transaction.atomic
    def update(self, instance, validated_data):
        contacts = validated_data.pop("contacts", None)
        center = super().update(instance, self._apply_location(validated_data))
        if contacts is not None:
            self._replace_contacts(center, contacts)
        return center

    def to_representation(self, instance):
        return EvacuationCenterSerializer(instance, context=self.context).data


class EvacuationReportSerializer(serializers.Serializer):
    """Validates one device's status transition report."""

    evacuation_id = serializers.IntegerField(required=False)
    barangay_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=EvacuationStatus.Status.choices)
    resolved_via = serializers.ChoiceField(
        choices=EvacuationStatus.ResolvedVia.choices, required=False, allow_blank=True
    )
    center_id = serializers.IntegerField(required=False, allow_null=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("evacuation_id") and not attrs.get("barangay_id"):
            raise serializers.ValidationError(
                "Provide evacuation_id or barangay_id."
            )
        return attrs


class EvacuationStatusSerializer(serializers.ModelSerializer):
    """Per-resident drill-down row for the operator console."""

    user = serializers.SerializerMethodField()
    center_name = serializers.SerializerMethodField()

    class Meta:
        model = EvacuationStatus
        fields = [
            "id", "user", "status", "resolved_via",
            "center", "center_name", "last_lat", "last_lng", "updated_at",
        ]

    def get_user(self, obj):
        u = obj.user
        label = u.get_full_name() or getattr(u, "email", "") or str(u.pk)
        return {"id": u.pk, "label": label}

    def get_center_name(self, obj):
        return obj.center.name if obj.center_id else None


class PingEvacuationSerializer(serializers.Serializer):
    """Operator ping input — the barangay to open an evacuation for."""

    barangay_id = serializers.IntegerField()


class EvacuationHistorySerializer(serializers.ModelSerializer):
    """One closed evacuation, answered from the row alone."""

    barangay = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Evacuation
        fields = [
            "id",
            "barangay",
            "trigger",
            "triggered_by_name",
            "opened_at",
            "closed_at",
            "duration_seconds",
            "final_roster",
            "final_safe",
            "final_moving",
            "final_unaccounted",
        ]

    def get_barangay(self, obj):
        return {"id": obj.barangay_id, "name": obj.barangay.name}

    def get_triggered_by_name(self, obj):
        """None for an automated run — the console renders that as "System"."""
        if not obj.triggered_by_id:
            return None
        user = obj.triggered_by
        return user.get_full_name() or user.get_username() or str(user.pk)

    def get_duration_seconds(self, obj):
        if not obj.closed_at:
            return None
        return int((obj.closed_at - obj.opened_at).total_seconds())
