# Rainfall Context — Flooding Incident in Brgy. Sinunuc, Zamboanga City

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2024-08-22 to 2024-09-07), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2024-08-29-sinunuc-rainfall-hourly.csv`](2024-08-29-sinunuc-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2024-08-29-sinunuc-rainfall-daily.json`](2024-08-29-sinunuc-rainfall-daily.json)
- **Day before event (2024-08-28) total:** 1.3 mm
- **Day after event (2024-09-01) total:** 11.0 mm
- **Total accumulation across the event span (2024-08-29 to 2024-08-31):** 42.5 mm
- **Total accumulation, week before (2024-08-22 to 2024-08-28):** 93.4 mm
- **Total accumulation, week after (2024-09-01 to 2024-09-07):** 28.8 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2024-08-22 | 19.1 |  |
| 2024-08-23 | 29.5 |  |
| 2024-08-24 | 13.8 |  |
| 2024-08-25 | 6.4 |  |
| 2024-08-26 | 11.1 |  |
| 2024-08-27 | 12.2 |  |
| 2024-08-28 | 1.3 | day before |
| 2024-08-29 | 8.0 | **event day** |
| 2024-08-30 | 14.4 | **event day** |
| 2024-08-31 | 20.1 | **event day** |
| 2024-09-01 | 11.0 | day after |
| 2024-09-02 | 4.5 |  |
| 2024-09-03 | 2.9 |  |
| 2024-09-04 | 0.8 |  |
| 2024-09-05 | 3.1 |  |
| 2024-09-06 | 1.6 |  |
| 2024-09-07 | 4.9 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.

## By barangay (localized, from Barangay model centroids)

Per-barangay hourly series: [`2024-08-29-sinunuc-rainfall-by-barangay-hourly.csv`](2024-08-29-sinunuc-rainfall-by-barangay-hourly.csv). Per-barangay daily totals + summary: [`2024-08-29-sinunuc-rainfall-by-barangay-daily.json`](2024-08-29-sinunuc-rainfall-by-barangay-daily.json).

Coordinates are the actual `Barangay` model boundary centroids from the FRACAS PostGIS database (pulled 2026-09-04), not looked-up approximations.

| Barangay | Lat, Lon | Day Before (2024-08-28) | Event Span (2024-08-29–2024-08-31) | Day After (2024-09-01) |
|---|---|---|---|---|
| Sinunoc | 7.0000, 122.0000 | 1.3 mm | 42.5 mm | 11.0 mm |
