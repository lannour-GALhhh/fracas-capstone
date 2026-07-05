from rest_framework.routers import DefaultRouter

from .views import EvacuationCenterView

router = DefaultRouter()
router.register(r"evacuation/centers", EvacuationCenterView, basename="evacuation-center")

urlpatterns = router.urls
