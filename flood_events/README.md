# Flood Events — Zamboanga City (2022–2026)

Source material for Zamboanga City flood incidents, compiled from DSWD DROMIC
(dromic.dswd.gov.ph) situation reports plus supporting news coverage. Organized
as `<year>/<month>/<date-slug>.md`, one file per distinct incident.

Each entry follows the same structure: Date, Location, Cause, Families/Persons
Affected, Casualties, Status, Source links, and Notes.

Every incident also has a companion **rainfall dataset**, pulled from the
Open-Meteo Historical Weather API, **model pinned to `era5`** (see correction
note below), for the same coordinates this project already uses for live
ingestion (`rainfall_fetch`), covering 1 week before through 1 week after the
event:

- `<slug>-rainfall.md` — daily-totals table (event days / day-before / day-after flagged) + caveats
- `<slug>-rainfall-hourly.csv` — full hourly precipitation series, city-wide reference point
- `<slug>-rainfall-daily.json` — city-wide daily totals + computed day-before/day-after/event-span sums

For the 5 incidents that name specific barangays (2024-06, 2024-07, 2024-08,
2025-06, 2025-08), there's also a **localized, per-barangay** dataset pulled
from the real `Barangay` model boundary centroids in the FRACAS PostGIS
database (not looked-up approximations):

- `<slug>-rainfall-by-barangay-hourly.csv` — one column per named barangay
- `<slug>-rainfall-by-barangay-daily.json` — per-barangay day-before/event-span/day-after totals
- a "By barangay" table appended to each `<slug>-rainfall.md`

The July 2024 event (13 barangays spanning both sides of the city) is the
clearest case where this matters — barangays split across several distinct
reanalysis grid cells, with event-span totals ranging 178.7–195.1mm depending
on which side of the city. Events where all named barangays sit close
together (San Roque; Sinunoc; the August 2025 Tumaga event) came back with
identical numbers across barangays — a real resolution limit of the ~31km
ERA5 grid, not a bug.

## ⚠ Correction: `best_match` → `era5`

The first pass of this dataset used Open-Meteo's default `best_match` model
blend. Cross-checking the 25–26 Aug 2025 Tumaga flash flood against the raw
hourly numbers (prompted by a manual review) showed `best_match` had
**silently dampened and reshaped the event-day signal**: it put the week's
peak rainfall on 22 Aug (20.4mm, no reported flooding) while showing only
7.5mm on 26 Aug, the actual flood day. Under plain `era5`, the picture
reverses and makes physical sense: 42.6mm on 22 Aug (a broad overnight/morning
rain band), and 20.3mm on 26 Aug arriving as a sustained afternoon-into-evening
buildup peaking ~2.2–2.3mm/hr — a shape consistent with a convective
flash-flood trigger, especially on top of an already-wet week.
`era5_land` (finer, ~9km) returned no data at all for this coastal grid cell,
so `era5` is the best of the three options available here.

**All figures in this dataset were re-pulled with `models=era5` explicitly**
after this was found — the table and files below reflect the corrected data.
Full detail in `2025/08/2025-08-25-tumaga-rainfall.md`.

## Index

| Date | Incident | Families / Persons | Day Before → Event Span → Day After (mm) | File |
|---|---|---|---|---|
| 2022-05-11 | ITCZ flooding, Zamboanga City | — | 19.1 → 38.3 → 8.6 | [2022/05](2022/05/2022-05-11-itcz-zamboanga-city.md) |
| 2023-01-31 | Flooding, Zamboanga City | — | 18.6 → 26.9 → 4.2 | [2023/01](2023/01/2023-01-31-zamboanga-city.md) |
| 2024-06-26 | Brgy. San Roque → citywide flooding | 3,167 / 14,465 | 11.4 → 70.1 → 16.7 | [2024/06](2024/06/2024-06-26-san-roque-zamboanga-city.md) |
| 2024-07-12 | Continued severe flooding (13 barangays) | 4,000+ families, 6 deaths | 31.5 → 178.7 → 8.8 | [2024/07](2024/07/2024-07-12-continued-flooding.md) |
| 2024-08-29 | Brgy. Sinunuc flooding | 14 / 55 | 1.3 → 42.5 → 11.0 | [2024/08](2024/08/2024-08-29-sinunuc.md) |
| 2025-06-07 | Flooding, Tumaga/Pasonanca/Boalan/Tugbungan/Lunzuran | 739 / 2,374 | 8.0 → 25.1 → 9.1 | [2025/06](2025/06/2025-06-07-zamboanga-city.md) |
| 2025-08-25 | Flash flood, Brgy. Tumaga | 407 families | 0.3 → 27.4 → 8.3 | [2025/08](2025/08/2025-08-25-tumaga.md) |
| 2026-07-30 | Trough of LPA, Zamboanga City → Peninsula | unconfirmed | 4.1 → 3.5 → 1.6 | [2026/07](2026/07/2026-07-30-trough-lpa-zamboanga-peninsula.md) |
| 2026-08-17 | Localized thunderstorm, Zamboanga Peninsula | unconfirmed | 0.0 → 0.7 → 1.8 | [2026/08](2026/08/2026-08-17-localized-thunderstorm.md) |

**Rainfall data caveat:** these are still ERA5 reanalysis grid-average
estimates (~31km grid), not gauge readings at the specific flooded barangay.
The 26 Jul – 1 Aug 2026 "Trough of LPA" event still shows an implausibly low
event-span total (3.5mm) for a reported flooding incident — treat that as an
open question rather than resolved, the same way the Tumaga number looked
wrong until checked. See each event's `-rainfall.md` for the full caveat list
before using these numbers for model calibration.

## Caveats

- DROMIC tracks each event under one living article/URL and renames or merges
  it as the affected area grows (e.g. a single-barangay report becoming a
  citywide, then peninsula-wide, report) — several entries above cross-link
  to a related month's file for this reason.
- Coverage is not exhaustive: DROMIC's monthly archive (2016–present) was not
  paged through in full, so isolated minor incidents may be missing.
- Two 2026 entries have unconfirmed family/casualty counts — the underlying
  sequential DROMIC PDF reports (not individually fetched) would need to be
  opened to fill those in.
- This is background/reference material, not yet in the format expected by
  `manage.py load_flood_events` (see `docs/BACKEND.md` §12) — say the word if
  you want a CSV derived from this for that command.
