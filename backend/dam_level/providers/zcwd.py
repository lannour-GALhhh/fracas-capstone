"""ZCWD dam-watch scraper (https://zcwd.gov.ph/production_new_bak.php).

The page is server-rendered HTML with no API, so we scrape it. Parsing is a
pure function over the HTML string, kept separate from the HTTP call so it can
be tested against a saved fixture. If the layout changes, only `_parse` moves.
"""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

from .base import DamProviderError, DamSnapshot

URL = "https://zcwd.gov.ph/production_new_bak.php"
TIMEOUT_SECONDS = 15
MANILA = ZoneInfo("Asia/Manila")

# Current level sits inside the <h1> right after the chartdata div.
_LEVEL_RE = re.compile(r'id="chartdata"></div>\s*([\d.]+)\s*m', re.IGNORECASE)
_NORMAL_RE = re.compile(r"Normal Level\s*=\s*([\d.]+)\s*m", re.IGNORECASE)
_DATE_RE = re.compile(r'id\s*=\s*"data"\s*>\s*([^<]+?)\s*<', re.IGNORECASE)
# Turbidity: the reading follows the "(Normal 5NTU)" label -> take the last NTU value.
_TURBIDITY_RE = re.compile(r"\)\s*([\d.]+)\s*NTU", re.IGNORECASE)
_DATE_FORMAT = "%a, %b %d, %Y @ %I%p"


class ZcwdScraperProvider:
    def fetch(self) -> DamSnapshot:
        try:
            response = requests.get(URL, timeout=TIMEOUT_SECONDS, headers={"User-Agent": "FRACAS/1.0"})
            response.raise_for_status()
        except requests.RequestException as exc:
            raise DamProviderError(f"ZCWD request failed: {exc}") from exc
        return self._parse(response.text)

    @staticmethod
    def _parse(html: str) -> DamSnapshot:
        level = _LEVEL_RE.search(html)
        date = _DATE_RE.search(html)
        if not level or not date:
            raise DamProviderError("Could not parse water level / timestamp from ZCWD page.")

        recorded_at = _parse_timestamp(date.group(1))
        normal = _NORMAL_RE.search(html)
        turbidity = _TURBIDITY_RE.search(html)

        return DamSnapshot(
            water_level=float(level.group(1)),
            recorded_at=recorded_at,
            normal_level=float(normal.group(1)) if normal else None,
            turbidity=float(turbidity.group(1)) if turbidity else None,
        )


def _parse_timestamp(raw: str) -> datetime:
    cleaned = re.sub(r"\s+", " ", raw).strip()
    try:
        naive = datetime.strptime(cleaned, _DATE_FORMAT)
    except ValueError as exc:
        raise DamProviderError(f"Unrecognised ZCWD timestamp: {raw!r}") from exc
    return naive.replace(tzinfo=MANILA)
