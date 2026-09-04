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
        quarter_times = [
            f"2026-07-01T{h:02d}:{m:02d}" for h in range(0, 8) for m in (0, 15, 30, 45)
        ]
        quarter_precip = list(range(len(quarter_times)))  # current 15-min bucket = index 16 (04:00)
        return {
            "current": {"time": "2026-07-01T04:00", "precipitation": 10},
            "hourly": {"time": times, "precipitation": precip},
            "minutely_15": {"time": quarter_times, "precipitation": quarter_precip},
        }

    def test_parses_intensity_and_accumulation(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["current_rainfall_strength"], 10)
        self.assertEqual(result["forecast_strength_1hr"], 2)
        self.assertEqual(result["accumulated_6hr"], 14)  # indices 0..4 -> 1+1+1+1+10
        self.assertEqual(result["accumulated_24hr"], 14)

    def test_parses_half_hour_forecasts(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["forecast_strength_30min"], 18)  # index 16 + 2
        self.assertEqual(result["forecast_strength_90min"], 22)  # index 16 + 6
        self.assertEqual(result["forecast_strength_150min"], 26)  # index 16 + 10
        self.assertEqual(result["forecast_strength_210min"], 30)  # index 16 + 14

    def test_missing_current_hour_defaults_to_zero(self):
        data = self._payload()
        data["current"]["time"] = "2026-07-01T23:00"  # not in hourly or minutely_15 times
        result = parse_rainfall_data(data)
        self.assertEqual(result["accumulated_24hr"], 0)
        self.assertEqual(result["current_rainfall_strength"], 0)
        self.assertEqual(result["forecast_strength_30min"], 0)
