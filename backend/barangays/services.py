from collections import defaultdict

from .constants import SUSCEPTIBILITY_VALUES
from .models import BarangaySusceptibility


def dominant_susceptibility_by_barangay() -> dict[int, dict]:
    """Each barangay's max()-aggregated susceptibility — worst-case, never
    averaged (life-safety early-warning system). One query, no N+1."""
    by_barangay = defaultdict(list)
    for row in BarangaySusceptibility.objects.values("barangay_id", "level"):
        by_barangay[row["barangay_id"]].append(row["level"])
    return {
        bid: {
            "level": (best := max(levels, key=lambda l: SUSCEPTIBILITY_VALUES[l])),
            "value": SUSCEPTIBILITY_VALUES[best],
            "zone_count": len(levels),
        }
        for bid, levels in by_barangay.items()
    }
