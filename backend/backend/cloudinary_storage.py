"""Django storage backend that keeps media in Cloudinary.

Uploads use the configured upload preset (unsigned) so only the cloud name and
preset are required; if an API key/secret are also set, uploads are signed and
deletes are performed.
"""
import os

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class CloudinaryMediaStorage(Storage):
    def __init__(self):
        cfg = settings.CLOUDINARY_STORAGE
        self.preset = cfg.get("UPLOAD_PRESET") or None
        self.signed = bool(cfg.get("API_KEY") and cfg.get("API_SECRET"))
        cloudinary.config(
            cloud_name=cfg["CLOUD_NAME"],
            api_key=cfg.get("API_KEY") or None,
            api_secret=cfg.get("API_SECRET") or None,
            secure=True,
        )

    @staticmethod
    def _split(name):
        public_id, ext = os.path.splitext(name)
        return public_id, ext.lstrip(".")

    def _save(self, name, content):
        public_id, ext = self._split(name)
        options = {"public_id": public_id, "resource_type": "image", "overwrite": False}
        if self.preset:
            options["upload_preset"] = self.preset
        if not self.signed:
            options["unsigned"] = True
        content.seek(0)
        result = cloudinary.uploader.upload(content, **options)
        # Cloudinary may append a suffix to the id; keep the stored name in sync.
        return f"{result['public_id']}.{result.get('format') or ext}"

    def exists(self, name):
        return False  # let Cloudinary/the preset resolve name collisions

    def url(self, name):
        public_id, ext = self._split(name)
        return cloudinary.utils.cloudinary_url(public_id, format=ext or None, secure=True)[0]

    def delete(self, name):
        if self.signed:
            cloudinary.uploader.destroy(self._split(name)[0], invalidate=True)

    def _open(self, name, mode="rb"):
        raise NotImplementedError("Cloudinary media is served by URL, not opened.")
