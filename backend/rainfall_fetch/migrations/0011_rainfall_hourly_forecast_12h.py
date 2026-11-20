from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rainfall_fetch", "0010_rainfall_hourly_inputs"),
    ]

    operations = [
        migrations.AddField(model_name="rainfall", name="hourly_forecast_5hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_6hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_7hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_8hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_9hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_10hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_11hr", field=models.FloatField(default=0)),
        migrations.AddField(model_name="rainfall", name="hourly_forecast_12hr", field=models.FloatField(default=0)),
    ]
