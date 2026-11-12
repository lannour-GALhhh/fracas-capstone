"""Run-inline "tasks": plain functions with a fire-and-forget `.delay()`.

There is no Celery worker or broker (it would not fit the free Render tier's
memory). `.delay()` simply runs the function in the calling process and logs,
rather than raises, any failure so a slow/broken side effect (email, SMS, push)
never fails the request that triggered it. Periodic work is fired by the
external cron (see monitoring/services/cron.py and backend/schedules.py).
"""

import functools
import logging

logger = logging.getLogger("tasks")


def task(fn):
    @functools.wraps(fn)
    def delay(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception:
            logger.exception("task_failed name=%s", fn.__name__)

    fn.delay = delay
    return fn
