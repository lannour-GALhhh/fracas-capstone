"""Display-geometry generalization for hazard-susceptibility zones."""

from django.db import connection

# Tuned against the Zamboanga hazard shapefile (degrees at ~7 deg N).
MIN_PART_SQM = 200.0
SNAP_GRID_DEG = 0.0002
SIMPLIFY_TOLERANCE_DEG = 0.0003

_REBUILD_SQL = """
UPDATE barangays_barangaysusceptibility s
SET geom_simplified = sub.g
FROM (
    SELECT t.id,
        ST_Multi(ST_CollectionExtract(
            ST_SimplifyPreserveTopology(
                ST_SnapToGrid(ST_Union(ST_MakeValid(dp.geom)), %(snap)s),
                %(tol)s
            ), 3
        )) AS g
    FROM barangays_barangaysusceptibility t,
         LATERAL ST_Dump(t.geom) dp
    WHERE ST_Area(dp.geom::geography) >= %(min_area)s
    GROUP BY t.id
) sub
WHERE s.id = sub.id AND sub.g IS NOT NULL AND NOT ST_IsEmpty(sub.g);
"""


def rebuild_simplified_geometry() -> int:
    """Regenerate every zone's `geom_simplified` from `geom`. Returns rows updated."""
    with connection.cursor() as cursor:
        cursor.execute(
            _REBUILD_SQL,
            {"snap": SNAP_GRID_DEG, "tol": SIMPLIFY_TOLERANCE_DEG, "min_area": MIN_PART_SQM},
        )
        return cursor.rowcount
