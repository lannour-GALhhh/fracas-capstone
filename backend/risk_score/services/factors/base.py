"""Contract every risk factor implements (Strategy pattern)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:  # avoid runtime import cycles
    from barangays.models import Barangay
    from rainfall_fetch.models import Rainfall

    from risk_score.services.context import ScoringContext


@dataclass(frozen=True)
class FactorInput:
    barangay: "Barangay"
    rainfall: "Rainfall | None"
    context: "ScoringContext"


@dataclass(frozen=True)
class FactorResult:
    key: str
    value: float  # normalized hazard, 0.0-1.0
    available: bool = True  # False -> input missing/stale; weight redistributed
    detail: dict = field(default_factory=dict)  # explainability


@runtime_checkable
class RiskFactor(Protocol):
    key: str

    def evaluate(self, data: FactorInput) -> FactorResult: ...
