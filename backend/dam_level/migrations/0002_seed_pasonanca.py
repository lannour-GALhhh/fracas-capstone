"""Seed the Pasonanca diversion dam.

normal_level (~crest) is 74.2 m per ZCWD; critical_level is a placeholder
flood threshold the LGU/DRRMO should confirm and tune via the admin.
"""

from django.db import migrations

NAME = "Pasonanca Diversion Dam"
NORMAL_LEVEL = 74.2
CRITICAL_LEVEL = 76.2  # placeholder — validate with LGU
SOURCE_URL = "https://zcwd.gov.ph/production_new_bak.php"


def seed(apps, schema_editor):
    Dam = apps.get_model("dam_level", "Dam")
    Dam.objects.get_or_create(
        name=NAME,
        defaults={
            "normal_level": NORMAL_LEVEL,
            "critical_level": CRITICAL_LEVEL,
            "source_url": SOURCE_URL,
        },
    )


def unseed(apps, schema_editor):
    Dam = apps.get_model("dam_level", "Dam")
    Dam.objects.filter(name=NAME).delete()


class Migration(migrations.Migration):
    dependencies = [("dam_level", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
