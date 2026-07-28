from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ActiveEvacuationsView,
    EvacuationCenterViewSet,
    EvacuationReportView,
    EvacuationStatusesView,
    MyEvacuationsView,
    PingEvacuationView,
    StandDownView,
)

router = DefaultRouter()
router.register(r"evacuation/centers", EvacuationCenterViewSet, basename="evacuation-center")

urlpatterns = router.urls + [
    # Resident device reports its own status transition.
    path("evacuation/report/", EvacuationReportView.as_view(), name="evacuation-report"),
    # Operator: open an evacuation by ping (POST) / read the dashboard aggregate.
    path("evacuation/evacuations/", PingEvacuationView.as_view(), name="evacuation-ping"),
    path(
        "evacuation/evacuations/active/",
        ActiveEvacuationsView.as_view(),
        name="evacuation-active",
    ),
    # Resident-facing: active evacuations for the caller's subscribed barangays.
    path(
        "evacuation/evacuations/for-me/",
        MyEvacuationsView.as_view(),
        name="evacuation-for-me",
    ),
    path(
        "evacuation/evacuations/<int:pk>/statuses/",
        EvacuationStatusesView.as_view(),
        name="evacuation-statuses",
    ),
    path(
        "evacuation/evacuations/<int:pk>/stand-down/",
        StandDownView.as_view(),
        name="evacuation-stand-down",
    ),
]
