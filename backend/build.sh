#!/bin/sh
# Release + start script for Render (Docker runtime).
#
# Runs at container START, not during `docker build`: image builds have no
# access to the database. Every step is idempotent, so redeploys are safe.
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_superuser   # reads FRACAS_ADMIN_USERNAME/PASSWORD/EMAIL

exec gunicorn backend.wsgi:application \
    --bind "0.0.0.0:${PORT:-10000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --timeout 120
