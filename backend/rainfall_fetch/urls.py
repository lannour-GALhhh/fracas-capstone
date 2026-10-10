from rest_framework.routers import DefaultRouter

from django.urls import path

from .settings_views import RainfallSettingsView
from .views import RainfallViewset

router = DefaultRouter()
router.register(r"rainfall", RainfallViewset, basename="rainfall")

urlpatterns = [
    path("admin/settings/rainfall/", RainfallSettingsView.as_view(), name="admin-settings-rainfall"),
    *router.urls,
]
