from rest_framework.routers import DefaultRouter

from django.urls import path

from .settings_views import RainfallGridView, RainfallSettingsView
from .views import RainfallViewset

router = DefaultRouter()
router.register(r"rainfall", RainfallViewset, basename="rainfall")

urlpatterns = [
    path("admin/settings/rainfall/", RainfallSettingsView.as_view(), name="admin-settings-rainfall"),
    path("admin/settings/rainfall/grid/", RainfallGridView.as_view(), name="admin-settings-rainfall-grid"),
    *router.urls,
]
