"""Pure normalization helpers — no DB, easy to unit-test."""


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def piecewise_linear(x: float, points: list[tuple[float, float]]) -> float:
    """Interpolate y for x across sorted (x, y) breakpoints; flat past the ends."""
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            span = x1 - x0
            return y0 if span == 0 else y0 + (y1 - y0) * (x - x0) / span
    return points[-1][1]


def _as_points(curve) -> list[tuple[float, float]]:
    """Coerce a config curve ([[x, y], ...]) to sorted tuple breakpoints."""
    return [(float(x), float(y)) for x, y in curve]


def normalize_rainfall(mm_per_hr: float, curve=None) -> float:
    """Map a rainfall intensity (mm/hr) to a 0-1 hazard via the active RiskConfig curve."""
    from risk_score.constants import DEFAULT_RAINFALL_CURVE

    points = _as_points(curve or DEFAULT_RAINFALL_CURVE)
    return clamp(piecewise_linear(max(0.0, mm_per_hr), points))


def normalize_accumulation(mm: float, curve=None) -> float:
    """Map accumulated rainfall (mm over ~24h) to a 0-1 saturation hazard."""
    from risk_score.constants import DEFAULT_ACCUMULATION_CURVE

    points = _as_points(curve or DEFAULT_ACCUMULATION_CURVE)
    return clamp(piecewise_linear(max(0.0, mm), points))


def normalize_position(value: float, low: float, high: float) -> float:
    """Where `value` sits in [low, high] as 0-1. Degenerate range -> 0."""
    if high <= low:
        return 0.0
    return clamp((value - low) / (high - low))


def percentile_rank(value: float, sorted_values: list[float]) -> float:
    """Rank of `value` within a sorted population, 0-1 (rank-based, resists outliers)."""
    import bisect

    n = len(sorted_values)
    if n <= 1:
        return 0.0
    below = bisect.bisect_left(sorted_values, value)
    return clamp(below / (n - 1))
