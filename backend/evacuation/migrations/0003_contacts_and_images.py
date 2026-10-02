import django.db.models.deletion
from django.db import migrations, models

import evacuation.models


def copy_contact_text(apps, schema_editor):
    """Keep each center's legacy single `contact` string as its first contact row."""
    Center = apps.get_model("evacuation", "EvacuationCenter")
    Contact = apps.get_model("evacuation", "EvacuationCenterContact")
    Contact.objects.bulk_create(
        Contact(center_id=c.id, phone=c.contact.strip())
        for c in Center.objects.exclude(contact="")
    )


def restore_contact_text(apps, schema_editor):
    Center = apps.get_model("evacuation", "EvacuationCenter")
    Contact = apps.get_model("evacuation", "EvacuationCenterContact")
    for center in Center.objects.all():
        first = Contact.objects.filter(center_id=center.id).order_by("id").first()
        if first:
            center.contact = first.phone
            center.save(update_fields=["contact"])


class Migration(migrations.Migration):

    dependencies = [
        ("evacuation", "0002_evacuation_evacuationstatus_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvacuationCenterContact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(blank=True, help_text="Who this reaches, e.g. 'Principal'.", max_length=100)),
                ("phone", models.CharField(max_length=50)),
                ("center", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contacts", to="evacuation.evacuationcenter")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.CreateModel(
            name="EvacuationCenterImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to=evacuation.models.center_image_path)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("center", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="evacuation.evacuationcenter")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.RunPython(copy_contact_text, restore_contact_text),
        migrations.RemoveField(model_name="evacuationcenter", name="contact"),
    ]
