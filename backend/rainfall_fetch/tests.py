from django.test import SimpleTestCase

from rainfall_fetch.tasks import _accumulate, parse_rainfall_data


class AccumulateTests(SimpleTestCase):
    def test_window_sum(self):
        precip = [1, 2, 3, 4, 5, 6, 7, 8]
        self.assertEqual(_accumulate(precip, 7, 3), 21)  # 6 + 7 + 8

    def test_window_clamps_at_start(self):
        precip = [1, 2, 3, 4]
        self.assertEqual(_accumulate(precip, 2, 6), 6)  # only 1 + 2 + 3 available


class ParseRainfallTests(SimpleTestCase):
    def _payload(self):
        times = [f"2026-07-01T{h:02d}:00" for h in range(0, 8)]
        precip = [1, 1, 1, 1, 10, 2, 3, 4]  # current hour = index 4 (04:00)
        return {
            "current": {"time": "2026-07-01T04:00", "precipitation": 10},
            "hourly": {"time": times, "precipitation": precip},
        }

    def test_parses_intensity_and_accumulation(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["current_rainfall_strength"], 10)
        self.assertEqual(result["forecast_strength_1hr"], 2)
        self.assertEqual(result["accumulated_6hr"], 14)  # indices 0..4 -> 1+1+1+1+10
        self.assertEqual(result["accumulated_24hr"], 14)

    def test_missing_current_hour_defaults_to_zero(self):
        data = self._payload()
        data["current"]["time"] = "2026-07-01T23:00"  # not in hourly times
        result = parse_rainfall_data(data)
        self.assertEqual(result["accumulated_24hr"], 0)
        self.assertEqual(result["current_rainfall_strength"], 0)
