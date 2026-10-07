"""Safely unpack an uploaded GIS archive and locate its vector layer."""

import zipfile
from pathlib import Path

LAYER_EXTENSIONS = (".shp", ".gpkg", ".geojson", ".json")
MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024  # 1 GiB zip-bomb guard


class ArchiveError(ValueError):
    """The upload isn't a usable GIS archive."""


def extract_archive(archive: Path, dest: Path) -> Path:
    """Unzip `archive` into `dest` (rejecting path traversal) and return the layer file inside."""
    if not zipfile.is_zipfile(archive):
        raise ArchiveError("Upload must be a .zip containing a shapefile, GeoPackage or GeoJSON.")
    dest.mkdir(parents=True, exist_ok=True)
    root = dest.resolve()
    with zipfile.ZipFile(archive) as zf:
        if sum(i.file_size for i in zf.infolist()) > MAX_UNCOMPRESSED_BYTES:
            raise ArchiveError("Archive is too large once extracted.")
        for member in zf.infolist():
            target = (root / member.filename).resolve()
            if root != target and root not in target.parents:
                raise ArchiveError("Archive contains an unsafe path.")
        zf.extractall(root)
    return find_layer_file(root)


def find_layer_file(folder: Path) -> Path:
    candidates = sorted(
        p for p in folder.rglob("*")
        if p.suffix.lower() in LAYER_EXTENSIONS and "__MACOSX" not in p.parts
    )
    if not candidates:
        raise ArchiveError("No .shp, .gpkg or .geojson file found in the archive.")
    # Prefer a shapefile/GeoPackage over loose JSON when an archive holds several.
    candidates.sort(key=lambda p: LAYER_EXTENSIONS.index(p.suffix.lower()))
    return candidates[0]
