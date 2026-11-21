from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rainfall_fetch", "0011_rainfall_hourly_forecast_12h"),
    ]

    operations = [
        migrations.AddField(
            model_name="rainfall",
            name="precipitation_probability",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
