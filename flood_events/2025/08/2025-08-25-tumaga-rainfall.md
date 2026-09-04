# Rainfall Context — Flash Flood in Brgy. Tumaga, Zamboanga City

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2025-08-18 to 2025-09-02), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2025-08-25-tumaga-rainfall-hourly.csv`](2025-08-25-tumaga-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2025-08-25-tumaga-rainfall-daily.json`](2025-08-25-tumaga-rainfall-daily.json)
- **Day before event (2025-08-24) total:** 0.3 mm
- **Day after event (2025-08-27) total:** 8.3 mm
- **Total accumulation across the event span (2025-08-25 to 2025-08-26):** 27.4 mm
- **Total accumulation, week before (2025-08-18 to 2025-08-24):** 96.2 mm
- **Total accumulation, week after (2025-08-27 to 2025-09-02):** 35.6 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2025-08-18 | 7.2 |  |
| 2025-08-19 | 18.6 |  |
| 2025-08-20 | 15.2 |  |
| 2025-08-21 | 10.0 |  |
| 2025-08-22 | 42.6 |  |
| 2025-08-23 | 2.3 |  |
| 2025-08-24 | 0.3 | day before |
| 2025-08-25 | 7.1 | **event day** |
| 2025-08-26 | 20.3 | **event day** |
| 2025-08-27 | 8.3 | day after |
| 2025-08-28 | 2.9 |  |
| 2025-08-29 | 5.4 |  |
| 2025-08-30 | 5.0 |  |
| 2025-08-31 | 2.9 |  |
| 2025-09-01 | 7.9 |  |
| 2025-09-02 | 3.2 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.

## By barangay (localized, from Barangay model centroids)

Per-barangay hourly series: [`2025-08-25-tumaga-rainfall-by-barangay-hourly.csv`](2025-08-25-tumaga-rainfall-by-barangay-hourly.csv). Per-barangay daily totals + summary: [`2025-08-25-tumaga-rainfall-by-barangay-daily.json`](2025-08-25-tumaga-rainfall-by-barangay-daily.json).

Coordinates are the actual `Barangay` model boundary centroids from the FRACAS PostGIS database (pulled 2026-09-04), not looked-up approximations.

| Barangay | Lat, Lon | Day Before (2025-08-24) | Event Span (2025-08-25–2025-08-26) | Day After (2025-08-27) |
|---|---|---|---|---|
| Tumaga | 7.0000, 122.0000 | 0.3 mm | 27.4 mm | 8.3 mm |
