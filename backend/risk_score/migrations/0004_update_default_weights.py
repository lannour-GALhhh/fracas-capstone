"""Remap every RiskConfig's weights from the old 3-factor split
(rainfall/dam/vulnerability) to the new 2-factor split (rainfall/susceptibility).

Real correctness fix, not just cleanup: RiskConfig.save() doesn't call
clean()/full_clean(), so a stale weights dict wouldn't error on save —
RiskEngine reads weights.get(r.key, 0), so susceptibility would silently
score at weight 0 (fully ignored) while its available=True.

Combines dam + vulnerability's old weight into susceptibility and
renormalizes with rainfall, preserving an operator's relative tuning rather
than hard-resetting everyone to 0.5/0.5 (the untouched seed row lands exactly
on 0.5/0.5, since 0.3 + 0.2 == 0.5, unchanged).
"""

from django.db import migrations


def remap_weights(apps, schema_editor):
    RiskConfig = apps.get_model("risk_score", "RiskConfig")
    for config in RiskConfig.objects.all():
        weights = dict(config.weights or {})
        dam = weights.pop("dam", 0.0)
        vulnerability = weights.pop("vulnerability", 0.0)
        rainfall = weights.get("rainfall", 0.0)
        susceptibility = dam + vulnerability
        total = rainfall + susceptibility

        if total > 0:
            weights["rainfall"] = round(rainfall / total, 6)
            weights["susceptibility"] = round(susceptibility / total, 6)
        else:
            weights["rainfall"] = 0.5
            weights["susceptibility"] = 0.5

        config.weights = weights
        config.save(update_fields=["weights"])


def restore_weights(apps, schema_editor):
    RiskConfig = apps.get_model("risk_score", "RiskConfig")
    for config in RiskConfig.objects.all():
        weights = dict(config.weights or {})
        susceptibility = weights.pop("susceptibility", 0.0)
        # Best-effort split matching the pre-migration 0.3/0.2 dam/vulnerability ratio.
        weights["dam"] = round(susceptibility * 0.6, 6)
        weights["vulnerability"] = round(susceptibility * 0.4, 6)
        config.weights = weights
        config.save(update_fields=["weights"])


class Migration(migrations.Migration):
    dependencies = [("risk_score", "0003_validationrun")]
    operations = [migrations.RunPython(remap_weights, restore_weights)]
