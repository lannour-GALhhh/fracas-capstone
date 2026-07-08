"""Risk-scoring Celery tasks and the ingest -> compute pipeline.

The pipeline lives here (not in an ingestion app) so feature apps stay
decoupled: risk_score depends on rainfall_fetch, never the reverse.
"""

import logging

from celery import chain, shared_task
from django.utils import timezone

from alert.tasks import evaluate_alerts
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
def run_validation_task(run_id: int) -> dict:
    """Execute the hindcast validation harness and fill the ValidationRun."""
    from .models import ValidationRun
    from .services.validation import validate

    run = ValidationRun.objects.get(pk=run_id)
    run.status = ValidationRun.Status.RUNNING
    run.save(update_fields=["status"])
    try:
        report = validate()
        run.events_evaluated = len(report.evaluated)
        run.hits = sum(o.hit for o in report.evaluated)
        run.recall = report.recall
        run.mean_score = report.mean_score
        run.details = [
            {
                "barangay": o.event.barangay.name,
                "occurred_at": o.event.occurred_at.isoformat(),
                "category": o.category,
                "score": o.score,
                "hit": o.hit,
                "error": o.error,
            }
            for o in report.outcomes
        ]
        run.status = ValidationRun.Status.DONE
    except Exception as exc:  # noqa: BLE001 - record any failure for the admin
        logger.exception("Validation run %s failed", run_id)
        run.status = ValidationRun.Status.FAILED
        run.error = str(exc)
    run.finished_at = timezone.now()
    run.save()
    return {"run_id": run_id, "status": run.status}


@shared_task
def draft_auto_flood_events() -> dict:
    """Draft unconfirmed flood events for barangays over the auto-detect threshold.

    Reads the just-computed cycle's scores and hands them to flood_events, which
    owns the drafting rules. One-way dependency (risk_score -> flood_events) so
    flood_events stays free of risk_score imports.
    """
    from flood_events.services.auto_detect import draft_events

    latest = (
        RiskScore.objects.order_by("-computed_at")
        .values_list("computed_at", flat=True)
        .first()
    )
    if latest is None:
        return {"created": 0}
    scores = RiskScore.objects.filter(computed_at=latest).select_related("barangay")
    return draft_events(scores)


@shared_task
def run_scoring_pipeline():
    """Ingest rainfall, then compute scores on the fresh data.

    Sequential chain (no result backend needed); each step feeds the next
    cycle's inputs. Ingestion failures are swallowed inside their tasks, so
    the pipeline still reaches compute and degrades gracefully.
    """
    chain(
        fetch_rainfall_information.si(),
        compute_risk_scores.si(),
        draft_auto_flood_events.si(),
        evaluate_alerts.si(),
    )()
