import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flood_events', '0009_reporterblock'),
    ]

    operations = [
        migrations.AddField(
            model_name='reporterblock',
            name='report',
            field=models.ForeignKey(
                blank=True,
                help_text='The report that triggered the block.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to='flood_events.floodeventreport',
            ),
        ),
    ]
