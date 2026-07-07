from django.urls import path

from .views import DamGeoView, DamStatusView

urlpatterns = [
    path("dam/status/", DamStatusView.as_view(), name="dam-status"),
    path("dam/geo/", DamGeoView.as_view(), name="dam-geo"),
]
