from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rainfall_fetch", "0009_rainfall_settings"),
    ]

    operations = [
        migrations.AddField(model_name="rainfall", name="hourly_current", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_1hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_2hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_3hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_4hr", field=models.FloatField(default=0)),
    ]
