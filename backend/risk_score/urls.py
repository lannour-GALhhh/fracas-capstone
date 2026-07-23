from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BarangayRiskView,
    LocalizedRiskView,
    RiskConfigViewSet,
    RiskSnapshotView,
    RiskZonesSnapshotView,
    ValidationRunViewSet,
)

router = DefaultRouter()
router.register(r"admin/risk-configs", RiskConfigViewSet, basename="risk-config")
router.register(r"admin/validation-runs", ValidationRunViewSet, basename="validation-run")

urlpatterns = [
    path("risk/snapshot/", RiskSnapshotView.as_view(), name="risk-snapshot"),
    path("risk/zones/snapshot/", RiskZonesSnapshotView.as_view(), name="risk-zones-snapshot"),
    path("risk/at/", LocalizedRiskView.as_view(), name="risk-localized"),
    path("risk/barangays/<int:pk>/", BarangayRiskView.as_view(), name="barangay-risk"),
] + router.urls
