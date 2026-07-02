from rest_framework import serializers

from barangays.models import Barangay

from .models import Notification


class BroadcastSerializer(serializers.Serializer):
    """Operator broadcast payload: target barangay + custom message."""

    barangay = serializers.PrimaryKeyRelatedField(queryset=Barangay.objects.all())
    title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    message = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "barangay", "barangay_name", "category", "title", "body", "is_read", "created_at"]
        read_only_fields = fields
