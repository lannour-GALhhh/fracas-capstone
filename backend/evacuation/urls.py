from rest_framework.routers import DefaultRouter

from .views import EvacuationCenterViewSet

router = DefaultRouter()
router.register(r"evacuation/centers", EvacuationCenterViewSet, basename="evacuation-center")

urlpatterns = router.urls
