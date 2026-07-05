"""Serializers for the anonymous phone-first registration endpoints."""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class RegisterStartSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    address = serializers.JSONField(required=False, default=dict)


class RegisterVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=6)


class RegisterResendSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)


class RegisterSetPasswordSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value
