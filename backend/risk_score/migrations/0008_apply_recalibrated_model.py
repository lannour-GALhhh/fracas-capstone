"""Move the active RiskConfig onto the recalibrated model (standard 25/50/75 thresholds).

Engine code changed alongside this: saturation is gated by rain intensity, susceptibility
multipliers are 0.4-1.0, and the 24h-accumulation curve is steeper. The stored config must
match, otherwise the old skewed thresholds/curve would be paired with the new engine.
Only the active row is touched; inactive saved configs are left as the operator made them.
"""

from django.db import migrations

NEW = {
    "thresholds": {"medium": 25.0, "high": 50.0, "critical": 75.0},
    "accumulation_curve": [[0.0, 0.0], [7.5, 0.35], [20.0, 0.65], [40.0, 0.9], [60.0, 1.0]],
    "zone_aggregation": "max",
}
OLD = {
    "thresholds": {"medium": 25.0, "high": 50.0, "critical": 75.0},
    "accumulation_curve": [[0.0, 0.0], [50.0, 0.33], [100.0, 0.66], [200.0, 1.0]],
    "zone_aggregation": "area_weighted",
}


def _apply(values):
    def run(apps, schema_editor):
        RiskConfig = apps.get_model("risk_score", "RiskConfig")
        RiskConfig.objects.filter(is_active=True).update(**values)

    return run


class Migration(migrations.Migration):

    dependencies = [
        ("risk_score", "0007_zone_aggregation_max_default"),
    ]

    operations = [migrations.RunPython(_apply(NEW), _apply(OLD))]
