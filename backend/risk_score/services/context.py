"""Per-cycle scoring context.

Loads everything the factors need in a handful of queries (no N+1) and
computes cross-barangay aggregates once. Built once per compute cycle and
shared across all barangays.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from django.utils import timezone

from barangays.models import Barangay
from barangays.services import dominant_susceptibility_by_barangay
from monitoring.constants import SOURCE_RAINFALL, STALE_AFTER
from rainfall_fetch.models import Rainfall


@dataclass
class ScoringContext:
    barangays: list[Barangay]
    rainfall_by_barangay: dict[int, Rainfall]
    susceptibility_by_barangay: dict[int, dict] = field(default_factory=dict)

    def rainfall_for(self, barangay: Barangay) -> Rainfall | None:
        return self.rainfall_by_barangay.get(barangay.id)

    def susceptibility_for(self, barangay: Barangay) -> dict | None:
        return self.susceptibility_by_barangay.get(barangay.id)

    @classmethod
    def build(cls) -> "ScoringContext":
        # defer the heavy boundary geometry — scoring doesn't need it.
        barangays = list(Barangay.objects.defer("boundary"))

        # Stale rainfall is dropped (treated as missing) so the engine degrades
        # the score and redistributes weight, rather than trusting an old
        # reading and emitting a false-low "all calm".
        cutoff = timezone.now() - STALE_AFTER[SOURCE_RAINFALL]

        # Latest reading per barangay in a single query (Postgres DISTINCT ON).
        latest = (
            Rainfall.objects.order_by("barangay_id", "-recorded_at")
            .distinct("barangay_id")
        )
        rainfall_by_barangay = {
            r.barangay_id: r for r in latest if r.recorded_at >= cutoff
        }

        return cls(
            barangays=barangays,
            rainfall_by_barangay=rainfall_by_barangay,
            susceptibility_by_barangay=dominant_susceptibility_by_barangay(),
        )
