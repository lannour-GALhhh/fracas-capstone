"""Seed the Pasonanca dam's map geometry.

Coordinates are approximate placeholders (the dam point plus a rough Tumaga
River corridor running south toward the coast) so the map, the dam panel and
the distance-decay factor have geometry to work with. The LGU/DRRMO should
refine these against official survey/hazard data.
"""

from django.contrib.gis.geos import LineString, MultiLineString, Point
from django.db import migrations

NAME = "Pasonanca Diversion Dam"

# Dam point (lng, lat).
DAM_LNG, DAM_LAT = 122.0720, 6.9820

# Rough Tumaga River corridor, dam -> coast, as (lng, lat) vertices.
RIVER_COORDS = [
    (122.0720, 6.9820),
    (122.0758, 6.9650),
    (122.0790, 6.9480),
    (122.0812, 6.9300),
    (122.0835, 6.9120),
    (122.0862, 6.9000),
]


def seed(apps, schema_editor):
    Dam = apps.get_model("dam_level", "Dam")
    dam = Dam.objects.filter(name=NAME).first()
    if dam is None:
        return
    dam.location = Point(DAM_LNG, DAM_LAT, srid=4326)
    dam.river = MultiLineString(
        LineString(RIVER_COORDS, srid=4326), srid=4326  # single-part line for now
    )
    dam.save(update_fields=["location", "river"])


def unseed(apps, schema_editor):
    Dam = apps.get_model("dam_level", "Dam")
    Dam.objects.filter(name=NAME).update(location=None, river=None)


class Migration(migrations.Migration):
    dependencies = [("dam_level", "0004_dam_influence_radius_km_dam_location_dam_river")]
    operations = [migrations.RunPython(seed, unseed)]
