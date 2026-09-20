"""Shared admin-console infrastructure: a singleton base and a config audit log."""

from django.conf import settings
from django.core.cache import cache
from django.db import models


class SingletonModel(models.Model):
    """Abstract single-row table (pk always 1) with a cached accessor."""

    class Meta:
        abstract = True

    @classmethod
    def _cache_key(cls) -> str:
        return f"settings:{cls._meta.label_lower}"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @classmethod
    def cached(cls):
        """Read the singleton from cache, populating it on a miss."""
        obj = cache.get(cls._cache_key())
        if obj is None:
            obj = cls.get_solo()
            cache.set(cls._cache_key(), obj, timeout=None)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete(self._cache_key())


class ConfigChangeLog(models.Model):
    """Append-only audit of config/settings/ops changes lacking a domain log."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    target = models.CharField(max_length=100, db_index=True)
    action = models.CharField(max_length=50, blank=True)
    field = models.CharField(max_length=50, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-changed_at"]
        indexes = [models.Index(fields=["target", "-changed_at"])]

    def __str__(self):
        detail = self.field or self.action or "change"
        return f"{detail} on {self.target}"
