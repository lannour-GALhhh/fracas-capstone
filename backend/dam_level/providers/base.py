"""Dam data provider contract + selection.

Ingestion depends only on this interface, so swapping the ZCWD scraper for a
future ZCWD API is a one-line config change (DAM_PROVIDER env var).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class DamProviderError(Exception):
    """Raised when a provider cannot produce a usable reading."""


@dataclass(frozen=True)
class DamSnapshot:
    water_level: float
    recorded_at: datetime
    normal_level: float | None = None
    turbidity: float | None = None


class DamDataProvider(Protocol):
    def fetch(self) -> DamSnapshot: ...


def get_provider(name: str | None = None) -> DamDataProvider:
    from decouple import config

    from .zcwd import ZcwdScraperProvider

    name = (name or config("DAM_PROVIDER", default="zcwd")).lower()
    providers = {"zcwd": ZcwdScraperProvider}
    try:
        return providers[name]()
    except KeyError:
        raise DamProviderError(f"Unknown dam provider: {name!r}")
