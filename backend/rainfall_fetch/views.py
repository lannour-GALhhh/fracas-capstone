from django.shortcuts import render
from rest_framework import viewsets
from serializers import (
    RainfallSerializer
)
from models import (
    Rainfall
)
# Create your views here.

class RainfallViewset(viewsets.ModelViewSet):
    queryset = Rainfall.objects.all().order_by('-created_at')
    serializer_class = RainfallSerializer
    