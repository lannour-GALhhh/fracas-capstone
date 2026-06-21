from rest_framework import serializers
from models import (
    Rainfall
)

class RainfallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rainfall
        fields = ["*"]