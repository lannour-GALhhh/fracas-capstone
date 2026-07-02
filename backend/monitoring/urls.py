from django.urls import path

from .views import LivenessView, ReadinessView, StatusView

urlpatterns = [
    path("health/", LivenessView.as_view()),
    path("health/ready/", ReadinessView.as_view()),
    path("health/status/", StatusView.as_view()),
]
