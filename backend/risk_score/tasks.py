"""Risk-scoring Celery tasks and the ingest -> compute pipeline.

The pipeline lives here (not in an ingestion app) so feature apps stay
decoupled: risk_score depends on rainfall_fetch, never the reverse.
"""

import logging

from celery import chain, shared_task
from django.utils import timezone

from dam_level.tasks import ingest_dam_level
from rainfall_fetch.tasks import fetch_rainfall_information

from .models import RiskScore
from .services import snapshot
from .services.context import ScoringContext
from .services.engine import RiskEngine
from .services.factors import FactorInput

logger = logging.getLogger(__name__)


@shared_task
def compute_risk_scores() -> dict:
    """Score every barangay from the latest inputs; persist + cache the result."""
    context = ScoringContext.build()
    engine = RiskEngine.from_active_config()
    config = engine.config if engine.config.pk else None  # None when using in-memory defaults
    computed_at = timezone.now()

    rows: list[RiskScore] = []
    entries: list[dict] = []
    for barangay in context.barangays:
        data = FactorInput(barangay=barangay, rainfall=context.rainfall_for(barangay), context=context)
        scored = engine.score(data)
        rows.append(
            RiskScore(
                barangay=barangay,
                score=scored.score,
                category=scored.category,
                breakdown=scored.breakdown,
                is_degraded=scored.is_degraded,
                config=config,
                computed_at=computed_at,
            )
        )
        entries.append(
            {
                "id": barangay.id,
                "name": barangay.name,
                "score": round(scored.score, 2),
                "category": scored.category.value,
                "is_degraded": scored.is_degraded,
            }
        )

    RiskScore.objects.bulk_create(rows)
    snapshot.store(computed_at, entries)
    logger.info("Computed risk scores for %d barangays", len(rows))
    return {"count": len(rows), "computed_at": computed_at.isoformat()}


@shared_task
def run_scoring_pipeline():
    """Ingest dam + rainfall, then compute scores on the fresh data.

    Sequential chain (no result backend needed); each step feeds the next
    cycle's inputs. Ingestion failures are swallowed inside their tasks, so
    the pipeline still reaches compute and degrades gracefully.
    """
    chain(
        ingest_dam_level.si(),
        fetch_rainfall_information.si(),
        compute_risk_scores.si(),
    )()
