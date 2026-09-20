"""Base view for Settings singletons: admin-gated read/update with change audit."""

from rest_framework.generics import RetrieveUpdateAPIView

from users.permissions import IsAdmin

from .services import log_field_diffs


class SingletonSettingsView(RetrieveUpdateAPIView):
    """RetrieveUpdate over a SingletonModel; every save is diffed into the audit log."""

    permission_classes = [IsAdmin]
    model = None
    target_label = ""

    def get_object(self):
        return self.model.get_solo()

    def perform_update(self, serializer):
        writable = [name for name, field in serializer.fields.items() if not field.read_only]
        before = {name: getattr(serializer.instance, name) for name in writable}
        instance = serializer.save()
        after = {name: getattr(instance, name) for name in writable}
        log_field_diffs(self.request.user, self.target_label, before, after)
