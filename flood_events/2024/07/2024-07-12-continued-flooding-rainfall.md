# Rainfall Context — Continued Severe Flooding, Zamboanga City

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2024-07-05 to 2024-07-23), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2024-07-12-continued-flooding-rainfall-hourly.csv`](2024-07-12-continued-flooding-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2024-07-12-continued-flooding-rainfall-daily.json`](2024-07-12-continued-flooding-rainfall-daily.json)
- **Day before event (2024-07-11) total:** 31.5 mm
- **Day after event (2024-07-17) total:** 8.8 mm
- **Total accumulation across the event span (2024-07-12 to 2024-07-16):** 178.7 mm
- **Total accumulation, week before (2024-07-05 to 2024-07-11):** 129.0 mm
- **Total accumulation, week after (2024-07-17 to 2024-07-23):** 57.0 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2024-07-05 | 17.8 |  |
| 2024-07-06 | 1.4 |  |
| 2024-07-07 | 4.0 |  |
| 2024-07-08 | 41.7 |  |
| 2024-07-09 | 16.6 |  |
| 2024-07-10 | 16.0 |  |
| 2024-07-11 | 31.5 | day before |
| 2024-07-12 | 60.1 | **event day** |
| 2024-07-13 | 87.0 | **event day** |
| 2024-07-14 | 14.3 | **event day** |
| 2024-07-15 | 12.6 | **event day** |
| 2024-07-16 | 4.7 | **event day** |
| 2024-07-17 | 8.8 | day after |
| 2024-07-18 | 17.4 |  |
| 2024-07-19 | 15.4 |  |
| 2024-07-20 | 5.8 |  |
| 2024-07-21 | 3.0 |  |
| 2024-07-22 | 3.3 |  |
| 2024-07-23 | 3.3 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.

## By barangay (localized, from Barangay model centroids)

Per-barangay hourly series: [`2024-07-12-continued-flooding-rainfall-by-barangay-hourly.csv`](2024-07-12-continued-flooding-rainfall-by-barangay-hourly.csv). Per-barangay daily totals + summary: [`2024-07-12-continued-flooding-rainfall-by-barangay-daily.json`](2024-07-12-continued-flooding-rainfall-by-barangay-daily.json).

Coordinates are the actual `Barangay` model boundary centroids from the FRACAS PostGIS database (pulled 2026-09-04), not looked-up approximations.

| Barangay | Lat, Lon | Day Before (2024-07-11) | Event Span (2024-07-12–2024-07-16) | Day After (2024-07-17) |
|---|---|---|---|---|
| Ayala | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| San Jose Gusu | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Patalon | 7.2500, 122.0000 | 28.7 mm | 195.1 mm | 11.1 mm |
| Pasonanca | 7.2500, 122.0000 | 28.7 mm | 195.1 mm | 11.1 mm |
| Putik | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Tetuan | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Vitali | 7.5000, 122.2500 | 19.7 mm | 190.5 mm | 13.1 mm |
| Talisayan | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Recodo | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Labuan | 7.2500, 122.0000 | 28.7 mm | 195.1 mm | 11.1 mm |
| Cawit | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Guiwan | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |
| Sinunoc | 7.0000, 122.0000 | 31.5 mm | 178.7 mm | 8.8 mm |

*Barangays show different totals because they span more than one reanalysis grid cell — this is the closest this dataset gets to genuine localized rainfall.*
