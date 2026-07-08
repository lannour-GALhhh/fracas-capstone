from .base import FactorInput, FactorResult, RiskFactor
from .rainfall import RainfallFactor
from .susceptibility import SusceptibilityFactor

# Order is cosmetic (breakdown display); weights come from RiskConfig.
DEFAULT_FACTORS: list[RiskFactor] = [
    RainfallFactor(),
    SusceptibilityFactor(),
]

__all__ = [
    "FactorInput",
    "FactorResult",
    "RiskFactor",
    "RainfallFactor",
    "SusceptibilityFactor",
    "DEFAULT_FACTORS",
]
