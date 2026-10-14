"""Parse an hourly-rainfall CSV (with an optional flood marker) for the per-barangay test."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import datetime, timedelta

MAX_ROWS = 2000

TIME_COLUMNS = ("datetime", "datetime_manila", "time", "timestamp", "date_time", "hour")
RAIN_COLUMNS = ("precipitation_mm", "precipitation", "rain_mm", "rainfall_mm", "rainfall", "rain")
MARK_COLUMNS = ("flood", "flood_declared", "flood_marker", "is_flood", "flood_event", "mark", "marked")
BARANGAY_COLUMN = "barangay"
TRUTHY = {"1", "true", "yes", "y", "x", "flood"}


class CsvError(ValueError):
    """The CSV can't be used; the message is shown to the admin as-is."""


@dataclass
class RainfallSeries:
    times: list[datetime]  # naive local hours, ascending, contiguous
    rain_mm: list[float]
    marks: list[datetime] = field(default_factory=list)  # hours flagged in the marker column
    warnings: list[str] = field(default_factory=list)


def parse_local_hour(raw: str) -> datetime:
    """Parse an ISO-style timestamp as naive local time, floored to the hour."""
    try:
        dt = datetime.fromisoformat(raw.strip().replace("Z", ""))
    except ValueError:
        raise CsvError(f"Can't read the time '{raw}'. Use e.g. 2023-01-31T14:00.")
    return dt.replace(tzinfo=None, minute=0, second=0, microsecond=0)


def _pick(columns: list[str], candidates: tuple[str, ...]) -> str | None:
    return next((c for c in candidates if c in columns), None)


def parse_rainfall_csv(raw: bytes, barangay_name: str | None = None) -> RainfallSeries:
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise CsvError("The file isn't UTF-8 text.")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise CsvError("The CSV is empty.")
    reader.fieldnames = [f.strip().lower() for f in reader.fieldnames]
    columns = reader.fieldnames

    time_col, rain_col = _pick(columns, TIME_COLUMNS), _pick(columns, RAIN_COLUMNS)
    if time_col is None:
        raise CsvError(f"No time column. Add one named {', '.join(TIME_COLUMNS[:3])}.")
    if rain_col is None:
        raise CsvError(f"No rainfall column. Add one named {', '.join(RAIN_COLUMNS[:3])}.")
    mark_col = _pick(columns, MARK_COLUMNS)

    rows = list(reader)
    warnings: list[str] = []

    # A multi-barangay file (like the ones exported with the flood reports) is narrowed to one.
    if BARANGAY_COLUMN in columns and barangay_name:
        wanted = barangay_name.strip().lower()
        kept = [r for r in rows if (r.get(BARANGAY_COLUMN) or "").strip().lower() == wanted]
        if not kept:
            raise CsvError(f"No rows for '{barangay_name}' in the barangay column.")
        if len(kept) != len(rows):
            warnings.append(f"Used {len(kept)} of {len(rows)} rows (barangay = {barangay_name}).")
        rows = kept

    if not rows:
        raise CsvError("The CSV has no data rows.")
    if len(rows) > MAX_ROWS:
        raise CsvError(f"Too many rows ({len(rows)}). The limit is {MAX_ROWS} hourly rows.")

    by_hour: dict[datetime, float] = {}
    marks: list[datetime] = []
    blanks = 0
    for line, row in enumerate(rows, start=2):
        hour = parse_local_hour(row.get(time_col) or "")
        if hour in by_hour:
            raise CsvError(f"Hour {hour:%Y-%m-%d %H:00} appears twice (line {line}).")
        value = (row.get(rain_col) or "").strip()
        if value == "":
            blanks += 1
            by_hour[hour] = 0.0
        else:
            try:
                mm = float(value)
            except ValueError:
                raise CsvError(f"Line {line}: '{value}' isn't a rainfall number.")
            if mm < 0:
                raise CsvError(f"Line {line}: rainfall can't be negative.")
            by_hour[hour] = mm
        if mark_col and (row.get(mark_col) or "").strip().lower() in TRUTHY:
            marks.append(hour)
    if blanks:
        warnings.append(f"{blanks} blank rainfall value(s) were read as 0 mm.")

    times = sorted(by_hour)
    for prev, nxt in zip(times, times[1:]):
        if nxt - prev != timedelta(hours=1):
            raise CsvError(f"Missing hour(s) between {prev:%Y-%m-%d %H:00} and {nxt:%Y-%m-%d %H:00}.")
    return RainfallSeries(times, [by_hour[t] for t in times], sorted(marks), warnings)
