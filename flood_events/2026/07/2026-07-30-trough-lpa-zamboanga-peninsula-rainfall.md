# Rainfall Context — Effects of Trough of LPA in Zamboanga City / Peninsula

Hourly and daily precipitation for Zamboanga City (7.0000, 122.0000), 1 week before through 1 week after the event (2026-07-23 to 2026-08-08), pulled from the Open-Meteo Historical Weather API (ERA5 reanalysis, hourly, mm) — the same provider this project already uses for live rainfall ingestion (`rainfall_fetch`).

- **Hourly series (full window):** [`2026-07-30-trough-lpa-zamboanga-peninsula-rainfall-hourly.csv`](2026-07-30-trough-lpa-zamboanga-peninsula-rainfall-hourly.csv)
- **Daily totals + computed summary (JSON):** [`2026-07-30-trough-lpa-zamboanga-peninsula-rainfall-daily.json`](2026-07-30-trough-lpa-zamboanga-peninsula-rainfall-daily.json)
- **Day before event (2026-07-29) total:** 4.1 mm
- **Day after event (2026-08-02) total:** 1.6 mm
- **Total accumulation across the event span (2026-07-30 to 2026-08-01):** 3.5 mm
- **Total accumulation, week before (2026-07-23 to 2026-07-29):** 107.8 mm
- **Total accumulation, week after (2026-08-02 to 2026-08-08):** 11.1 mm

## Daily totals (mm)

| Date | Total (mm) | Note |
|---|---|---|
| 2026-07-23 | 72.9 |  |
| 2026-07-24 | 13.6 |  |
| 2026-07-25 | 7.4 |  |
| 2026-07-26 | 1.6 |  |
| 2026-07-27 | 4.5 |  |
| 2026-07-28 | 3.7 |  |
| 2026-07-29 | 4.1 | day before |
| 2026-07-30 | 2.1 | **event day** |
| 2026-07-31 | 0.6 | **event day** |
| 2026-08-01 | 0.8 | **event day** |
| 2026-08-02 | 1.6 | day after |
| 2026-08-03 | 1.1 |  |
| 2026-08-04 | 0.0 |  |
| 2026-08-05 | 2.5 |  |
| 2026-08-06 | 2.2 |  |
| 2026-08-07 | 2.4 |  |
| 2026-08-08 | 1.3 |  |

## Caveats

- **Model pinned to `era5` explicitly** (not Open-Meteo's default `best_match` blend). An initial pull of this dataset used `best_match`, and a manual check against the 25–26 Aug 2025 Tumaga flash flood (see that event's rainfall file) found it silently dampened the event-day signal — 7.5mm on the actual flood day vs 20.4mm three days earlier with no reported flooding, reversed under raw `era5` (20.3mm on the flood day vs 42.6mm on the earlier day) — and also smoothed away the afternoon-building hourly shape that raw ERA5 preserved. `era5_land` returned no data at all at this coastal grid cell, so `era5` is the most reliable of the three available here. All figures below reflect the `era5`-pinned re-pull.
- Figures are still **model reanalysis estimates (ERA5, ~31 km grid)**, not a physical gauge reading at the flooded barangay — they represent the area-average rainfall over a wide grid cell, not necessarily what fell over the specific barangay(s) named in the incident report.
- Flash floods are frequently driven by short, hyper-local convective bursts (tens of mm in under an hour over one barangay) that a coarse reanalysis grid can still under-report in its area-average even after pinning to `era5` — treat a low daily total on an event day as a possible known limitation, not automatic evidence the DROMIC report is wrong.
- All events use a single fixed Zamboanga City reference point (7.0000, 122.0000) rather than per-barangay coordinates, for consistency across the dataset and because most incidents span multiple barangays.
- No PAGASA station-gauge or radar QPE data was cross-checked against these reanalysis figures; do that before using these numbers for anything beyond rough calibration context.
