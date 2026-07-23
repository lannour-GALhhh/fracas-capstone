"""Tunable risk-scoring configuration (weights + category thresholds).

Kept in the DB so an LGU operator can recalibrate the model via the admin
without a redeploy. Exactly one row is active at a time.
"""

from django.core.exceptions import ValidationError
from django.db import models

from risk_score.constants import (
    COMBINATION_MODES,
    COMBINATION_WEIGHTED_SUM,
    DEFAULT_ACCUMULATION_CURVE,
    DEFAULT_COMBINATION_MODE,
    DEFAULT_RAINFALL_CURVE,
    DEFAULT_THRESHOLDS,
    DEFAULT_WEIGHTS,
    DEFAULT_ZONE_AGGREGATION,
    FACTOR_KEYS,
    RiskCategory,
    SCORE_MAX,
    ZONE_AGGREGATIONS,
)


def default_weights() -> dict:
    return dict(DEFAULT_WEIGHTS)


def default_thresholds() -> dict:
    return {cat.value: bound for cat, bound in DEFAULT_THRESHOLDS.items()}


def default_rainfall_curve() -> list:
    return [list(pt) for pt in DEFAULT_RAINFALL_CURVE]


def default_accumulation_curve() -> list:
    return [list(pt) for pt in DEFAULT_ACCUMULATION_CURVE]


def _validate_curve(name: str, curve) -> None:
    """A curve is a non-empty list of [x, y] points, x ascending & >=0, y in 0-1."""
    if not isinstance(curve, list) or not curve:
        raise ValidationError({name: "Must be a non-empty list of [x, y] points."})
    last_x = None
    for point in curve:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValidationError({name: "Each point must be an [x, y] pair."})
        x, y = point
        if not (0.0 <= float(y) <= 1.0):
            raise ValidationError({name: "Hazard (y) must be within 0.0-1.0."})
        if float(x) < 0.0:
            raise ValidationError({name: "x (mm) must be >= 0."})
        if last_x is not None and float(x) <= last_x:
            raise ValidationError({name: "x values must strictly ascend."})
        last_x = float(x)


# Category order from most to least severe — used to classify a score.
_SEVERITY_ORDER = (RiskCategory.CRITICAL, RiskCategory.HIGH, RiskCategory.MEDIUM)


class RiskConfig(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False, db_index=True)

    # How rainfall + susceptibility combine into a hazard (see constants).
    combination_mode = models.CharField(
        max_length=20,
        choices=[(m, m) for m in COMBINATION_MODES],
        default=DEFAULT_COMBINATION_MODE,
    )
    # Additive weights — only used in the legacy weighted_sum mode.
    weights = models.JSONField(default=default_weights)
    thresholds = models.JSONField(default=default_thresholds)

    # Admin-tunable rainfall scaling: mm/hr -> hazard and mm(24h) -> saturation.
    rainfall_curve = models.JSONField(default=default_rainfall_curve)
    accumulation_curve = models.JSONField(default=default_accumulation_curve)
    # How a barangay's per-zone scores collapse to one number.
    zone_aggregation = models.CharField(
        max_length=16,
        choices=[(a, a) for a in ZONE_AGGREGATIONS],
        default=DEFAULT_ZONE_AGGREGATION,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        active = " (active)" if self.is_active else ""
        return f"{self.name}{active}"

    # --- validation -----------------------------------------------------
    def clean(self):
        # Weights only govern the legacy additive mode; enforce their sum there.
        if self.combination_mode == COMBINATION_WEIGHTED_SUM:
            missing = set(FACTOR_KEYS) - set(self.weights)
            if missing:
                raise ValidationError({"weights": f"Missing factor weights: {sorted(missing)}"})
            total = sum(self.weights.get(k, 0) for k in FACTOR_KEYS)
            if abs(total - 1.0) > 1e-6:
                raise ValidationError({"weights": f"Weights must sum to 1.0 (got {total})."})

        _validate_curve("rainfall_curve", self.rainfall_curve)
        _validate_curve("accumulation_curve", self.accumulation_curve)

        bounds = [self.thresholds.get(c.value) for c in _SEVERITY_ORDER]
        if any(b is None for b in bounds):
            raise ValidationError({"thresholds": "Provide medium/high/critical bounds."})
        # critical > high > medium, all within scale.
        if not (0 < bounds[2] < bounds[1] < bounds[0] <= SCORE_MAX):
            raise ValidationError({"thresholds": "Thresholds must be ordered medium < high < critical."})

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_active:
            RiskConfig.objects.exclude(pk=self.pk).filter(is_active=True).update(is_active=False)

    # --- behaviour ------------------------------------------------------
    def categorize(self, score: float) -> RiskCategory:
        for category in _SEVERITY_ORDER:
            if score >= self.thresholds[category.value]:
                return category
        return RiskCategory.LOW

    @classmethod
    def get_active(cls) -> "RiskConfig":
        """Active config, or an unsaved defaults instance so scoring never fails."""
        active = cls.objects.filter(is_active=True).first()
        return active or cls(name="defaults", is_active=True)
