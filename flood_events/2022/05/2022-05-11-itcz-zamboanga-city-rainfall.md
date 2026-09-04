# Rainfall Context — Flooding due to ITCZ in Zamboanga City

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2022-05-04 to 2022-05-20), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2022-05-11-itcz-zamboanga-city-rainfall-hourly.csv`](2022-05-11-itcz-zamboanga-city-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2022-05-11-itcz-zamboanga-city-rainfall-daily.json`](2022-05-11-itcz-zamboanga-city-rainfall-daily.json)
- **Day before event (2022-05-10) total:** 19.1 mm
- **Day after event (2022-05-14) total:** 8.6 mm
- **Total accumulation across the event span (2022-05-11 to 2022-05-13):** 38.3 mm
- **Total accumulation, week before (2022-05-04 to 2022-05-10):** 58.2 mm
- **Total accumulation, week after (2022-05-14 to 2022-05-20):** 50.1 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2022-05-04 | 7.9 |  |
| 2022-05-05 | 7.2 |  |
| 2022-05-06 | 3.6 |  |
| 2022-05-07 | 1.7 |  |
| 2022-05-08 | 8.3 |  |
| 2022-05-09 | 10.4 |  |
| 2022-05-10 | 19.1 | day before |
| 2022-05-11 | 7.6 | **event day** |
| 2022-05-12 | 4.8 | **event day** |
| 2022-05-13 | 25.9 | **event day** |
| 2022-05-14 | 8.6 | day after |
| 2022-05-15 | 4.3 |  |
| 2022-05-16 | 13.0 |  |
| 2022-05-17 | 6.7 |  |
| 2022-05-18 | 5.9 |  |
| 2022-05-19 | 3.6 |  |
| 2022-05-20 | 8.0 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.
