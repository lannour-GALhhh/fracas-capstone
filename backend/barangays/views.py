# DJANGO
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

# REST FRAMEWORK
from rest_framework import viewsets
from rest_framework.response import Response

# LOCAL
from .models import (
    Barangay
)
from .serializers import (
    BarangayListSerializer
)

@method_decorator(cache_page(60 * 15, key_prefix='barangay_list'),
                  name='list',
                  )
class BarangayListView(viewsets.ReadOnlyModelViewSet):
    queryset = Barangay.objects.all()
    serializer_class = BarangayListSerializer