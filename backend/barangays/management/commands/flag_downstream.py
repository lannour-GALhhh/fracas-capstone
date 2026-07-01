"""Flag barangays downstream of the Pasonanca dam (Tumaga River corridor).

Downstream barangays weight the dam factor heavily, since a spilling dam
raises the Tumaga river stage that floods them. The default list is a starting
point and should be validated with the LGU/DRRMO against official hazard maps.

    python manage.py flag_downstream                 # apply the default list
    python manage.py flag_downstream --reset         # clear, then apply default
    python manage.py flag_downstream --names Tumaga Guiwan
"""

from django.core.management.base import BaseCommand

from barangays.models import Barangay

DEFAULT_DOWNSTREAM = [
    "Tumaga",
    "Guiwan",
    "Tetuan",
    "Camino Nuevo",
    "Santa Maria",
    "San Roque",
    "Mampang",
]


class Command(BaseCommand):
    help = "Mark downstream (Tumaga-corridor) barangays for dam-factor weighting."

    def add_arguments(self, parser):
        parser.add_argument("--names", nargs="+", help="Override the downstream barangay names.")
        parser.add_argument("--reset", action="store_true", help="Clear all flags before applying.")

    def handle(self, *args, **options):
        names = options["names"] or DEFAULT_DOWNSTREAM

        if options["reset"]:
            cleared = Barangay.objects.filter(is_downstream=True).update(is_downstream=False)
            self.stdout.write(f"Cleared {cleared} existing downstream flag(s).")

        matched, missing = 0, []
        for name in names:
            updated = Barangay.objects.filter(name__iexact=name).update(is_downstream=True)
            matched += updated
            if not updated:
                missing.append(name)

        self.stdout.write(self.style.SUCCESS(f"Flagged {matched} downstream barangay(s)."))
        if missing:
            self.stdout.write(self.style.WARNING(f"No match for: {', '.join(missing)}"))
