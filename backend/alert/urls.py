from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BroadcastView, NotificationViewSet

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = router.urls + [
    path("admin/broadcasts/", BroadcastView.as_view(), name="alert-broadcast"),
]
