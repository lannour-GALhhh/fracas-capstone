from collections import defaultdict

from .constants import SUSCEPTIBILITY_VALUES
from .models import BarangaySusceptibility


def dominant_susceptibility_by_barangay() -> dict[int, dict]:
    """Each barangay's max()-aggregated susceptibility — worst-case, never
    averaged (life-safety early-warning system). One query, no N+1.

    Also carries a `levels` breakdown (area share per level present) so
    callers can explain *why* a barangay scored the way it did when it spans
    more than one susceptibility zone, without changing the worst-case
    aggregation used for `value`/`level` itself.
    """
    by_barangay = defaultdict(list)
    for row in BarangaySusceptibility.objects.values("barangay_id", "level", "area_sqm"):
        by_barangay[row["barangay_id"]].append(row)

    result = {}
    for bid, rows in by_barangay.items():
        levels = [row["level"] for row in rows]
        best = max(levels, key=lambda l: SUSCEPTIBILITY_VALUES[l])
        total_area = sum(row["area_sqm"] for row in rows)

        area_by_level = defaultdict(float)
        for row in rows:
            area_by_level[row["level"]] += row["area_sqm"]

        # One entry per distinct level present, worst-first, each carrying its
        # 0-1 susceptibility value + area share. The rainfall-gated engine scores
        # each of these zones and averages them for the barangay headline number.
        zones = [
            {
                "level": level,
                "value": SUSCEPTIBILITY_VALUES[level],
                "area_sqm": area,
                "share": area / total_area if total_area else 0.0,
            }
            for level, area in sorted(
                area_by_level.items(), key=lambda kv: SUSCEPTIBILITY_VALUES[kv[0]], reverse=True
            )
        ]

        result[bid] = {
            "level": best,
            "value": SUSCEPTIBILITY_VALUES[best],
            "zone_count": len(levels),
            "zones": zones,
            "levels": {z["level"]: {"area_sqm": z["area_sqm"], "share": z["share"]} for z in zones},
        }
    return result
