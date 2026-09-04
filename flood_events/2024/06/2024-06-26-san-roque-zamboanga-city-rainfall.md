# Rainfall Context — Flooding Incident in Brgy. San Roque, Zamboanga City

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2024-06-19 to 2024-07-08), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2024-06-26-san-roque-zamboanga-city-rainfall-hourly.csv`](2024-06-26-san-roque-zamboanga-city-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2024-06-26-san-roque-zamboanga-city-rainfall-daily.json`](2024-06-26-san-roque-zamboanga-city-rainfall-daily.json)
- **Day before event (2024-06-25) total:** 11.4 mm
- **Day after event (2024-07-02) total:** 16.7 mm
- **Total accumulation across the event span (2024-06-26 to 2024-07-01):** 70.1 mm
- **Total accumulation, week before (2024-06-19 to 2024-06-25):** 122.4 mm
- **Total accumulation, week after (2024-07-02 to 2024-07-08):** 99.3 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2024-06-19 | 28.5 |  |
| 2024-06-20 | 22.6 |  |
| 2024-06-21 | 8.6 |  |
| 2024-06-22 | 7.4 |  |
| 2024-06-23 | 25.2 |  |
| 2024-06-24 | 18.7 |  |
| 2024-06-25 | 11.4 | day before |
| 2024-06-26 | 22.9 | **event day** |
| 2024-06-27 | 11.3 | **event day** |
| 2024-06-28 | 2.5 | **event day** |
| 2024-06-29 | 8.0 | **event day** |
| 2024-06-30 | 9.4 | **event day** |
| 2024-07-01 | 16.0 | **event day** |
| 2024-07-02 | 16.7 | day after |
| 2024-07-03 | 8.3 |  |
| 2024-07-04 | 9.4 |  |
| 2024-07-05 | 17.8 |  |
| 2024-07-06 | 1.4 |  |
| 2024-07-07 | 4.0 |  |
| 2024-07-08 | 41.7 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.

## By barangay (localized, from Barangay model centroids)

Per-barangay hourly series: [`2024-06-26-san-roque-zamboanga-city-rainfall-by-barangay-hourly.csv`](2024-06-26-san-roque-zamboanga-city-rainfall-by-barangay-hourly.csv). Per-barangay daily totals + summary: [`2024-06-26-san-roque-zamboanga-city-rainfall-by-barangay-daily.json`](2024-06-26-san-roque-zamboanga-city-rainfall-by-barangay-daily.json).

Coordinates are the actual `Barangay` model boundary centroids from the FRACAS PostGIS database (pulled 2026-09-04), not looked-up approximations.

| Barangay | Lat, Lon | Day Before (2024-06-25) | Event Span (2024-06-26–2024-07-01) | Day After (2024-07-02) |
|---|---|---|---|---|
| San Roque | 7.0000, 122.0000 | 11.4 mm | 70.1 mm | 16.7 mm |
