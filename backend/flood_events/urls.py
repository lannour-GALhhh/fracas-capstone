from django.urls import path

from .views import FloodEventDetailView, FloodEventListView

urlpatterns = [
    path("flood-events/", FloodEventListView.as_view(), name="flood-event-list"),
    path("flood-events/<int:pk>/", FloodEventDetailView.as_view(), name="flood-event-detail"),
]
