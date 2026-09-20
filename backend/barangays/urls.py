from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BarangayListView,
    BarangayPublicView,
    HazardZoneListView,
    HighRiskStreetListView,
)

router = DefaultRouter()

router.register(r'barangays', BarangayListView, basename="barangay")
router.register(r'hazard-zones', HazardZoneListView, basename="hazard-zone")
router.register(r'high-risk-streets', HighRiskStreetListView, basename="high-risk-street")

urlpatterns = [
    # Explicit path BEFORE the router so it isn't swallowed by `barangays/{pk}/`.
    path(
        "barangays/public/",
        BarangayPublicView.as_view({"get": "list"}),
        name="barangay-public",
    ),
    *router.urls,
]