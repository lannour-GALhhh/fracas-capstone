# Rainfall Context — Effects of Localized Thunderstorm in Zamboanga Peninsula

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2026-08-10 to 2026-08-24), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2026-08-17-localized-thunderstorm-rainfall-hourly.csv`](2026-08-17-localized-thunderstorm-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2026-08-17-localized-thunderstorm-rainfall-daily.json`](2026-08-17-localized-thunderstorm-rainfall-daily.json)
- **Day before event (2026-08-16) total:** 0.0 mm
- **Day after event (2026-08-18) total:** 1.8 mm
- **Total accumulation across the event span (2026-08-17 to 2026-08-17):** 0.7 mm
- **Total accumulation, week before (2026-08-10 to 2026-08-16):** 1.5 mm
- **Total accumulation, week after (2026-08-18 to 2026-08-24):** 1.9 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2026-08-10 | 0.4 |  |
| 2026-08-11 | 0.2 |  |
| 2026-08-12 | 0.0 |  |
| 2026-08-13 | 0.4 |  |
| 2026-08-14 | 0.5 |  |
| 2026-08-15 | 0.0 |  |
| 2026-08-16 | 0.0 | day before |
| 2026-08-17 | 0.7 | **event day** |
| 2026-08-18 | 1.8 | day after |
| 2026-08-19 | 0.0 |  |
| 2026-08-20 | 0.0 |  |
| 2026-08-21 | 0.0 |  |
| 2026-08-22 | 0.1 |  |
| 2026-08-23 | 0.0 |  |
| 2026-08-24 | 0.0 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.
