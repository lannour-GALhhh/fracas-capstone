from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import RiskConfig, ValidationRun


class RiskConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskConfig
        fields = [
            "id",
            "name",
            "is_active",
            "combination_mode",
            "weights",
            "thresholds",
            "rainfall_curve",
            "accumulation_curve",
            "zone_aggregation",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]

    _CLEAN_FIELDS = (
        "name",
        "combination_mode",
        "weights",
        "thresholds",
        "rainfall_curve",
        "accumulation_curve",
        "zone_aggregation",
    )

    def validate(self, attrs):
        # Merge onto a transient instance so RiskConfig.clean() enforces its rules.
        instance = self.instance or RiskConfig()
        merged = {**{f: getattr(instance, f) for f in self._CLEAN_FIELDS}, **attrs}
        candidate = RiskConfig(**merged)
        try:
            candidate.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        return attrs


class ValidationRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValidationRun
        fields = [
            "id",
            "status",
            "created_at",
            "finished_at",
            "events_evaluated",
            "hits",
            "recall",
            "mean_score",
            "details",
            "error",
        ]
        # All fields are computed by the async task; create makes an empty run.
        read_only_fields = fields


class BarangayRiskSerializer(serializers.Serializer):
    """Assembles latest risk + rainfall for one barangay (read-only)."""

    def to_representation(self, instance):
        b, s, r = instance["barangay"], instance["score"], instance["rainfall"]
        zones = (s.breakdown or {}).get("zones", []) if s else []
        return {
            "id": b.id,
            "name": b.name,
            "status": s.category if s else None,
            "risk_score": round(s.score, 2) if s else None,
            "average": round(s.score, 2) if s else None,
            "zones": zones,
            "is_degraded": s.is_degraded if s else None,
            "breakdown": s.breakdown if s else None,
            "computed_at": s.computed_at.isoformat() if s else None,
            "current_rainfall": r.current_rainfall_strength if r else None,
            "rainfall_forecast_15min": r.forecast_strength_15min if r else None,
            "rainfall_forecast_30min": r.forecast_strength_30min if r else None,
            "rainfall_forecast_45min": r.forecast_strength_45min if r else None,
            "rainfall_forecast_60min": r.forecast_strength_60min if r else None,
            "rainfall_forecast_75min": r.forecast_strength_75min if r else None,
            "rainfall_forecast_90min": r.forecast_strength_90min if r else None,
            "rainfall_forecast_105min": r.forecast_strength_105min if r else None,
            "rainfall_forecast_120min": r.forecast_strength_120min if r else None,
            "rainfall_forecast_135min": r.forecast_strength_135min if r else None,
            "rainfall_forecast_150min": r.forecast_strength_150min if r else None,
            "rainfall_forecast_165min": r.forecast_strength_165min if r else None,
            "rainfall_forecast_180min": r.forecast_strength_180min if r else None,
            "rainfall_forecast_195min": r.forecast_strength_195min if r else None,
            "rainfall_forecast_210min": r.forecast_strength_210min if r else None,
            "rainfall_forecast_225min": r.forecast_strength_225min if r else None,
            "rainfall_forecast_240min": r.forecast_strength_240min if r else None,
            "accumulated_24hr": r.accumulated_24hr if r else None,
            "accumulated_7day": r.accumulated_7day if r else None,
            "rainfall_rate_change": float(r.rate_of_change) if r and r.rate_of_change is not None else None,
            "recorded_at": r.recorded_at.isoformat() if r else None,
        }
