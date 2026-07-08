from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BarangayRiskView, RiskConfigViewSet, RiskSnapshotView, ValidationRunViewSet

router = DefaultRouter()
router.register(r"admin/risk-configs", RiskConfigViewSet, basename="risk-config")
router.register(r"admin/validation-runs", ValidationRunViewSet, basename="validation-run")

urlpatterns = [
    path("risk/snapshot/", RiskSnapshotView.as_view(), name="risk-snapshot"),
    path("risk/barangays/<int:pk>/", BarangayRiskView.as_view(), name="barangay-risk"),
] + router.urls
