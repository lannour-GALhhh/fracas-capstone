from django.urls import path

from .views import (
    HotspotsView,
    ModelPerformanceView,
    RainfallTimelineView,
    SummaryView,
)

urlpatterns = [
    path("analytics/summary/", SummaryView.as_view(), name="analytics-summary"),
    path("analytics/hotspots/", HotspotsView.as_view(), name="analytics-hotspots"),
    path(
        "analytics/rainfall-timeline/",
        RainfallTimelineView.as_view(),
        name="analytics-rainfall-timeline",
    ),
    path(
        "analytics/model-performance/",
        ModelPerformanceView.as_view(),
        name="analytics-model-performance",
    ),
]
