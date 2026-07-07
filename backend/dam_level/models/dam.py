"""Dam metadata.

Pasonanca is a diversion dam on the Tumaga River; its level is a proxy for
downstream river stage. `normal_level` ~ crest; hazard rises as the level
climbs from normal toward `critical_level` (operator-tunable).

`location` and `river` are its map geometry: the dam point and the river
corridor it feeds. The dam factor decays a barangay's dam hazard with its
distance to that corridor, reaching zero past `influence_radius_km`.
"""

from django.contrib.gis.db import models

# Fallback influence radius (km) when a dam row predates the geometry fields.
DEFAULT_INFLUENCE_RADIUS_KM = 8.0


class Dam(models.Model):
    name = models.CharField(max_length=150, unique=True)
    normal_level = models.FloatField(help_text="Normal operating level in metres (~crest).")
    critical_level = models.FloatField(help_text="Flood-critical level in metres.")
    source_url = models.URLField(blank=True)

    # --- map geometry + spatial influence ---
    location = models.PointField(
        srid=4326, null=True, blank=True, help_text="Dam location (lng/lat)."
    )
    river = models.MultiLineStringField(
        srid=4326, null=True, blank=True,
        help_text="River corridor fed by the dam (e.g. the Tumaga River).",
    )
    influence_radius_km = models.FloatField(
        default=DEFAULT_INFLUENCE_RADIUS_KM,
        help_text="Distance beyond which the dam no longer contributes flood hazard.",
    )

    def __str__(self):
        return self.name
