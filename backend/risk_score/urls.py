from django.urls import path

from .views import BarangayRiskView, RiskSnapshotView

urlpatterns = [
    path("risk/snapshot/", RiskSnapshotView.as_view(), name="risk-snapshot"),
    path("risk/barangays/<int:pk>/", BarangayRiskView.as_view(), name="barangay-risk"),
]
