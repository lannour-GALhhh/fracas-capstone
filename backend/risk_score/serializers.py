from rest_framework import serializers


class BarangayRiskSerializer(serializers.Serializer):
    """Assembles latest risk + rainfall for one barangay (read-only)."""

    def to_representation(self, instance):
        b, s, r = instance["barangay"], instance["score"], instance["rainfall"]
        return {
            "id": b.id,
            "name": b.name,
            "status": s.category if s else None,
            "risk_score": round(s.score, 2) if s else None,
            "is_degraded": s.is_degraded if s else None,
            "breakdown": s.breakdown if s else None,
            "computed_at": s.computed_at.isoformat() if s else None,
            "current_rainfall": r.current_rainfall_strength if r else None,
            "rainfall_forecast_1hr": r.forecast_strength_1hr if r else None,
            "rainfall_forecast_2hr": r.forecast_strength_2hr if r else None,
            "rainfall_forecast_3hr": r.forecast_strength_3hr if r else None,
            "rainfall_forecast_4hr": r.forecast_strength_4hr if r else None,
            "accumulated_24hr": r.accumulated_24hr if r else None,
            "rainfall_rate_change": float(r.rate_of_change) if r and r.rate_of_change is not None else None,
            "recorded_at": r.recorded_at.isoformat() if r else None,
        }
