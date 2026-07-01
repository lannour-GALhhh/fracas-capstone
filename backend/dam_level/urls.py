from django.urls import path

from .views import DamStatusView

urlpatterns = [
    path("dam/status/", DamStatusView.as_view(), name="dam-status"),
]
