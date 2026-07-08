"""Integration tests for `load_flood_susceptibility` geoprocessing correctness.

Builds a small synthetic shapefile via `ogr2ogr` (mirroring the real
ZAM_FLOOD.shp schema: `Flood` numeric + `susc_level` string, stored in
EPSG:32651) rather than shipping a binary fixture, so the test doubles as
documentation of the expected input shape.
"""

import json
import subprocess
import tempfile
from pathlib import Path

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.management import call_command
from django.test import TestCase

from barangays.models import Barangay, BarangaySusceptibility


def make_barangay(name, code, coords):
    poly = Polygon(coords)
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


def build_shapefile(path: Path, features: list[dict]) -> Path:
    """Write `features` (each {geometry, Flood, susc_level}) as a shapefile at
    `path`, reprojecting from the GeoJSON's implicit WGS84 to EPSG:32651 —
    matching how the real ZAM_FLOOD.shp is stored."""
    geojson_path = path.with_suffix(".geojson")
    geojson_path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"Flood": f["Flood"], "susc_level": f["susc_level"]},
                        "geometry": f["geometry"],
                    }
                    for f in features
                ],
            }
        )
    )
    subprocess.run(
        [
            "ogr2ogr", "-f", "ESRI Shapefile",
            "-s_srs", "EPSG:4326", "-t_srs", "EPSG:32651",
            str(path), str(geojson_path),
        ],
        check=True, capture_output=True,
    )
    return path


class FloodSusceptibilityLoaderTests(TestCase):
    # Two adjacent ~1km squares near Zamboanga City, sharing the edge at lng=122.01.
    BARANGAY_A = [(122.00, 6.90), (122.00, 6.91), (122.01, 6.91), (122.01, 6.90), (122.00, 6.90)]
    BARANGAY_B = [(122.01, 6.90), (122.01, 6.91), (122.02, 6.91), (122.02, 6.90), (122.01, 6.90)]

    def setUp(self):
        self.barangay_a = make_barangay("Barangay A", "A1", self.BARANGAY_A)
        self.barangay_b = make_barangay("Barangay B", "B1", self.BARANGAY_B)
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

    def _load(self, features, **options):
        shapefile = build_shapefile(Path(self.tmpdir.name) / "test.shp", features)
        call_command("load_flood_susceptibility", shapefile=str(shapefile), **options)

    def test_single_barangay_containment(self):
        # Fully inside Barangay A only.
        contained = {
            "type": "Polygon",
            "coordinates": [[[122.002, 6.902], [122.002, 6.908], [122.008, 6.908], [122.008, 6.902], [122.002, 6.902]]],
        }
        self._load([{"geometry": contained, "Flood": 4.0, "susc_level": "High"}])

        rows = BarangaySusceptibility.objects.all()
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().barangay_id, self.barangay_a.id)
        self.assertEqual(rows.first().level, "high")

    def test_cross_barangay_straddling(self):
        # Spans the shared edge at lng=122.01, into both A and B.
        straddling = {
            "type": "Polygon",
            "coordinates": [[[122.005, 6.900], [122.005, 6.910], [122.015, 6.910], [122.015, 6.900], [122.005, 6.900]]],
        }
        self._load([{"geometry": straddling, "Flood": 3.0, "susc_level": "Moderate"}])

        rows = BarangaySusceptibility.objects.all()
        self.assertEqual(rows.count(), 2)
        barangay_ids = set(rows.values_list("barangay_id", flat=True))
        self.assertEqual(barangay_ids, {self.barangay_a.id, self.barangay_b.id})
        self.assertTrue(all(r.level == "moderate" for r in rows))

    def test_invalid_geometry_make_valid_fallback(self):
        # Self-intersecting bowtie, fully within Barangay A's bbox.
        bowtie = {
            "type": "Polygon",
            "coordinates": [[[122.003, 6.903], [122.007, 6.907], [122.007, 6.903], [122.003, 6.907], [122.003, 6.903]]],
        }
        # Should not raise despite the invalid source ring.
        self._load([{"geometry": bowtie, "Flood": 5.0, "susc_level": "Very High"}])

        rows = BarangaySusceptibility.objects.all()
        self.assertEqual(rows.count(), 1)
        self.assertTrue(rows.first().geom.valid)

    def test_idempotent_rerun(self):
        contained = {
            "type": "Polygon",
            "coordinates": [[[122.002, 6.902], [122.002, 6.908], [122.008, 6.908], [122.008, 6.902], [122.002, 6.902]]],
        }
        features = [{"geometry": contained, "Flood": 4.0, "susc_level": "High"}]
        self._load(features)
        self._load(features)  # re-run against the same source

        self.assertEqual(BarangaySusceptibility.objects.count(), 1)
