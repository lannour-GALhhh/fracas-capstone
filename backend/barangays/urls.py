from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BarangayListView
)

router = DefaultRouter()

router.register(r'barangays', BarangayListView, basename="barangay")

urlpatterns = router.urls