from django.urls import path
from rest_framework.routers import DefaultRouter

from .import_views import ActiveGisLayersView, GisImportDetailView, GisImportListCreateView
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
    path("admin/gis-imports/", GisImportListCreateView.as_view(), name="admin-gis-imports"),
    path("admin/gis-imports/active/", ActiveGisLayersView.as_view(), name="admin-gis-active"),
    path("admin/gis-imports/<int:pk>/", GisImportDetailView.as_view(), name="admin-gis-import-detail"),
    *router.urls,
]