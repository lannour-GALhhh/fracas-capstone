from rest_framework import serializers

from .models import MapPoiChange


class MapPoiChangeSerializer(serializers.ModelSerializer):
    editor_name = serializers.CharField(source="editor.get_full_name", read_only=True)
    editor_username = serializers.CharField(source="editor.username", read_only=True)

    class Meta:
        model = MapPoiChange
        fields = [
            "id",
            "poi_type",
            "poi_id",
            "name",
            "action",
            "longitude",
            "latitude",
            "detail",
            "editor",
            "editor_name",
            "editor_username",
            "created_at",
        ]
