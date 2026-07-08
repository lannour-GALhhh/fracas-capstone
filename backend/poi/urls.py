from django.urls import path

from .views import PoiChangeLogView

urlpatterns = [
    path("poi/logs/", PoiChangeLogView.as_view(), name="poi-logs"),
]
