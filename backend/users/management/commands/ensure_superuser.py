"""Create the first admin account from environment variables (idempotent).

Reads FRACAS_ADMIN_USERNAME / FRACAS_ADMIN_PASSWORD / FRACAS_ADMIN_EMAIL. Runs on
every deploy: does nothing if the variables are unset or the user already
exists, and never resets an existing account's password.
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the initial superuser from FRACAS_ADMIN_* environment variables."

    def handle(self, *args, **options):
        username = os.environ.get("FRACAS_ADMIN_USERNAME", "").strip()
        password = os.environ.get("FRACAS_ADMIN_PASSWORD", "")
        email = os.environ.get("FRACAS_ADMIN_EMAIL", "").strip()

        if not (username and password):
            self.stdout.write("FRACAS_ADMIN_USERNAME/PASSWORD not set; skipping admin creation.")
            return

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Admin '{username}' already exists; leaving it unchanged.")
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created admin '{username}'."))
