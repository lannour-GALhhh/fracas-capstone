import tempfile

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.management import call_command
from django.test import TestCase

from barangays.models import Barangay
from flood_events.management.commands.load_flood_events import parse_occurred_at
from flood_events.models import FloodEvent


class ParseOccurredAtTests(TestCase):
    def test_parses_datetime_and_date(self):
        self.assertIsNotNone(parse_occurred_at("2024-07-15T14:00"))
        self.assertIsNotNone(parse_occurred_at("2024-07-15"))  # date -> local noon
        self.assertIsNone(parse_occurred_at("not-a-date"))


class LoadFloodEventsTests(TestCase):
    def setUp(self):
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )

    def test_imports_matching_rows_only(self):
        csv = (
            "barangay,occurred_at,severity,water_depth_m,source,notes\n"
            "Tumaga,2024-07-15T14:00,major,1.2,test,\n"
            "Nowhere,2024-07-15T14:00,minor,,test,\n"  # unmatched barangay -> skipped
        )
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as fh:
            fh.write(csv)
            path = fh.name

        call_command("load_flood_events", path)

        self.assertEqual(FloodEvent.objects.count(), 1)
        event = FloodEvent.objects.get()
        self.assertEqual(event.barangay.name, "Tumaga")
        self.assertEqual(event.severity, "major")
        self.assertEqual(event.water_depth_m, 1.2)
