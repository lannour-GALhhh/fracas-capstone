from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BarangayListView,
    BarangayPublicView,
    HazardZoneListView,
)

router = DefaultRouter()

router.register(r'barangays', BarangayListView, basename="barangay")
router.register(r'hazard-zones', HazardZoneListView, basename="hazard-zone")

urlpatterns = [
    # Explicit path BEFORE the router so `barangays/public/` isn't swallowed by
    # the router's `barangays/{pk}/` detail route (pk='public' → 404).
    path(
        "barangays/public/",
        BarangayPublicView.as_view({"get": "list"}),
        name="barangay-public",
    ),
    *router.urls,
]