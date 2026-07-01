"""Dam metadata.

Pasonanca is a diversion dam on the Tumaga River; its level is a proxy for
downstream river stage. `normal_level` ~ crest; hazard rises as the level
climbs from normal toward `critical_level` (operator-tunable).
"""

from django.db import models


class Dam(models.Model):
    name = models.CharField(max_length=150, unique=True)
    normal_level = models.FloatField(help_text="Normal operating level in metres (~crest).")
    critical_level = models.FloatField(help_text="Flood-critical level in metres.")
    source_url = models.URLField(blank=True)

    def __str__(self):
        return self.name
