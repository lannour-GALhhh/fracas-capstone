from django.test import SimpleTestCase

from barangays.management.commands.load_susceptibility import parse_susceptibility


class ParseSusceptibilityTests(SimpleTestCase):
    def test_numeric(self):
        self.assertEqual(parse_susceptibility("0.75"), 0.75)
        self.assertEqual(parse_susceptibility("2"), 1.0)  # clamped
        self.assertEqual(parse_susceptibility("-1"), 0.0)  # clamped

    def test_categorical(self):
        self.assertEqual(parse_susceptibility("Low"), 0.25)
        self.assertEqual(parse_susceptibility("moderate"), 0.5)
        self.assertEqual(parse_susceptibility("High"), 0.75)
        self.assertEqual(parse_susceptibility("Very High"), 1.0)

    def test_blank_and_unknown(self):
        self.assertIsNone(parse_susceptibility(""))
        self.assertIsNone(parse_susceptibility("bogus"))
