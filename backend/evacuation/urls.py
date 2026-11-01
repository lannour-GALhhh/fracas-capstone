from django.urls import path
from rest_framework.routers import DefaultRouter

from .radius_views import (
    RadiusEvacuationsView,
    RadiusHistoryView,
    RadiusReportView,
    RadiusStandDownView,
)
from .views import (
    ActiveEvacuationsView,
    EvacuationCenterViewSet,
    EvacuationHistoryView,
    EvacuationReportView,
    EvacuationStatusesView,
    MyEvacuationsView,
    PingEvacuationView,
    StandDownView,
)

router = DefaultRouter()
router.register(r"evacuation/centers", EvacuationCenterViewSet, basename="evacuation-center")

urlpatterns = router.urls + [
    # Point + radius evacuations (geography-based, independent of barangays).
    path("evacuation/radius/", RadiusEvacuationsView.as_view(), name="radius-evacuations"),
    path("evacuation/radius/history/", RadiusHistoryView.as_view(), name="radius-history"),
    path("evacuation/radius/report/", RadiusReportView.as_view(), name="radius-report"),
    path(
        "evacuation/radius/<int:pk>/stand-down/",
        RadiusStandDownView.as_view(),
        name="radius-stand-down",
    ),
    # Resident device reports its own status transition.
    path("evacuation/report/", EvacuationReportView.as_view(), name="evacuation-report"),
    # Operator: open an evacuation by ping (POST) / read the dashboard aggregate.
    path("evacuation/evacuations/", PingEvacuationView.as_view(), name="evacuation-ping"),
    path(
        "evacuation/evacuations/active/",
        ActiveEvacuationsView.as_view(),
        name="evacuation-active",
    ),
    # Operator: paginated archive of stood-down evacuations.
    path(
        "evacuation/evacuations/history/",
        EvacuationHistoryView.as_view(),
        name="evacuation-history",
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
