from rest_framework import serializers

from .models import FloodEvent


class FloodEventSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = FloodEvent
        fields = [
            "id",
            "barangay",
            "barangay_name",
            "occurred_at",
            "severity",
            "water_depth_m",
            "source",
            "notes",
        ]
