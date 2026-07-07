from django.urls import path

from .views import (
    AutoDetectConfigView,
    FloodEventChangesView,
    FloodEventConfirmView,
    FloodEventDetailView,
    FloodEventListView,
    FloodEventReportsView,
    FloodEventResolveView,
    FloodEventRestoreView,
    MyFloodActivityView,
)

urlpatterns = [
    path("flood-events/auto-detect-config/", AutoDetectConfigView.as_view(), name="auto-detect-config"),
    path("flood-events/my-activity/", MyFloodActivityView.as_view(), name="flood-event-my-activity"),
    path("flood-events/", FloodEventListView.as_view(), name="flood-event-list"),
    path("flood-events/<int:pk>/", FloodEventDetailView.as_view(), name="flood-event-detail"),
    path("flood-events/<int:pk>/changes/", FloodEventChangesView.as_view(), name="flood-event-changes"),
    path("flood-events/<int:pk>/reports/", FloodEventReportsView.as_view(), name="flood-event-reports"),
    path("flood-events/<int:pk>/confirm/", FloodEventConfirmView.as_view(), name="flood-event-confirm"),
    path("flood-events/<int:pk>/resolve/", FloodEventResolveView.as_view(), name="flood-event-resolve"),
    path("flood-events/<int:pk>/restore/", FloodEventRestoreView.as_view(), name="flood-event-restore"),
]
