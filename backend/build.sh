#!/bin/sh
# Release + start script for Render (Docker runtime).
#
# Runs at container START, not during `docker build`: image builds have no
# access to the database. Every step is idempotent, so redeploys are safe.
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_superuser   # reads FRACAS_ADMIN_USERNAME/PASSWORD/EMAIL

# Sized for Render's 512MB tier: every worker *process* carries its own copy of
# Django + GDAL + numpy (~150-250MB), so scale with threads (shared memory), not
# workers. Raise WEB_CONCURRENCY only after upgrading the instance.
# --max-requests recycles the worker periodically so slow heap growth can't
# accumulate into an OOM kill.
exec gunicorn backend.wsgi:application \
    --bind "0.0.0.0:${PORT:-10000}" \
    --workers "${WEB_CONCURRENCY:-1}" \
    --threads "${GUNICORN_THREADS:-4}" \
    --worker-class gthread \
    --max-requests 500 \
    --max-requests-jitter 50 \
    --timeout 120
