"""Base serializer for Settings singletons: runs the model's own validation."""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class SingletonSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        model = self.Meta.model
        writable = [name for name, field in self.fields.items() if not field.read_only]
        merged = {name: getattr(self.instance, name) for name in writable}
        merged.update(attrs)
        candidate = model(**merged)
        candidate.pk = 1
        try:
            candidate.clean_fields(exclude=["id"])
            candidate.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            )
        return attrs
