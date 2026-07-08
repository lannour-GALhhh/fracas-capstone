"""Validate the risk model against recorded flood events.

    python manage.py validate_model

Hindcasts each FloodEvent's barangay and reports whether the model would have
raised a HIGH/CRITICAL warning, plus the overall detection rate.
"""

from django.core.management.base import BaseCommand

from risk_score.services.validation import validate


class Command(BaseCommand):
    help = "Validate the risk model against recorded flood events via hindcasting."

    def handle(self, *args, **options):
        report = validate()
        if not report.outcomes:
            self.stdout.write("No flood events recorded. Import some with load_flood_events.")
            return

        for o in report.outcomes:
            when = o.event.occurred_at.strftime("%Y-%m-%d %H:%M")
            name = o.event.barangay.name
            if o.error:
                self.stdout.write(self.style.WARNING(f"  skip  {name} @ {when}: {o.error}"))
            else:
                mark = self.style.SUCCESS("  HIT ") if o.hit else "  miss"
                self.stdout.write(f"{mark} {name} @ {when}: predicted {o.category} ({o.score})")

        evaluated = len(report.evaluated)
        self.stdout.write("")
        self.stdout.write(f"Evaluated {evaluated}/{len(report.outcomes)} event(s).")
        if report.recall is not None:
            self.stdout.write(self.style.SUCCESS(f"Detection rate (HIGH/CRITICAL): {report.recall:.0%}"))
            self.stdout.write(f"Mean predicted score: {report.mean_score:.1f}/100")
