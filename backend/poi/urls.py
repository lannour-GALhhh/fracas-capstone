from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FloodHotspotViewSet, PoiChangeLogView

router = DefaultRouter()
router.register(r"hotspots", FloodHotspotViewSet, basename="hotspot")

urlpatterns = [
    path("poi/logs/", PoiChangeLogView.as_view(), name="poi-logs"),
    *router.urls,
]
