from rest_framework.routers import DefaultRouter

from .views import RainfallViewset

router = DefaultRouter()
router.register(r"rainfall", RainfallViewset, basename="rainfall")

urlpatterns = router.urls
