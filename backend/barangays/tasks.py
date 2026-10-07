"""Background processing of admin-uploaded GIS layers."""

import logging
import shutil
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .importers.archive import ArchiveError, extract_archive
from .importers.boundaries import BoundaryImportError, import_boundaries
from .importers.susceptibility import SusceptibilityImportError, import_susceptibility
from .models import GisImport

logger = logging.getLogger(__name__)

EXPECTED_ERRORS = (ArchiveError, BoundaryImportError, SusceptibilityImportError)
# cache_page key prefixes of the views that serve imported geometry.
GEOMETRY_CACHE_PATTERNS = ("*barangay_list*", "*barangay_public*", "*hazard_zone_list*")


def import_dir(import_id: int) -> Path:
    return Path(settings.GIS_IMPORT_DIR) / str(import_id)


def _invalidate_geometry_caches() -> None:
    delete_pattern = getattr(cache, "delete_pattern", None)  # django-redis only
    if delete_pattern:
        for pattern in GEOMETRY_CACHE_PATTERNS:
            delete_pattern(pattern)


@shared_task
def process_gis_import(import_id: int) -> None:
    job = GisImport.objects.get(pk=import_id)
    job.status = GisImport.Status.RUNNING
    job.save(update_fields=["status"])
    folder = import_dir(import_id)
    try:
        layer = extract_archive(folder / "upload.zip", folder / "extracted")
        if job.kind == GisImport.Kind.BOUNDARY:
            result = import_boundaries(layer)
        else:
            result = import_susceptibility(layer)
        job.status, job.result = GisImport.Status.SUCCEEDED, result
    except EXPECTED_ERRORS as exc:
        job.status, job.message = GisImport.Status.FAILED, str(exc)
    except Exception:
        logger.exception("GIS import %s crashed", import_id)
        job.status, job.message = GisImport.Status.FAILED, "Unexpected error while processing the file."
    finally:
        shutil.rmtree(folder, ignore_errors=True)

    job.finished_at = timezone.now()
    job.save()
    if job.status == GisImport.Status.SUCCEEDED:
        _invalidate_geometry_caches()
        from risk_score.tasks import compute_risk_scores  # lazy: risk_score depends on barangays, not vice versa

        compute_risk_scores.delay()
