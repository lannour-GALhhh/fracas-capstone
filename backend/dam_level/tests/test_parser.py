from pathlib import Path

from django.test import SimpleTestCase

from dam_level.providers.base import DamProviderError
from dam_level.providers.zcwd import ZcwdScraperProvider

FIXTURE = Path(__file__).parent / "fixtures" / "zcwd_sample.html"


class ZcwdParserTests(SimpleTestCase):
    def test_parses_real_fixture(self):
        snap = ZcwdScraperProvider._parse(FIXTURE.read_text())
        self.assertEqual(snap.water_level, 74.2)
        self.assertEqual(snap.normal_level, 74.2)
        self.assertEqual(snap.turbidity, 1.79)
        self.assertEqual(snap.recorded_at.year, 2026)
        self.assertEqual(snap.recorded_at.hour, 9)
        self.assertEqual(str(snap.recorded_at.tzinfo), "Asia/Manila")

    def test_missing_fields_raises(self):
        with self.assertRaises(DamProviderError):
            ZcwdScraperProvider._parse("<html>no data here</html>")
