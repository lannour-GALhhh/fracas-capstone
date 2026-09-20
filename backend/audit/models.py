"""Shared admin-console infrastructure: a singleton base and a config audit log.

`SingletonModel` generalizes the `AutoDetectConfig.get_solo()` pattern already in
`flood_events` so every admin Settings group is a typed, single-row table with a
cached read that busts on save (some sit on the 15-min hot path).

`ConfigChangeLog` is the append-only trail for changes that have no per-domain log
of their own — RiskConfig activation, Settings edits, manual ops actions. It feeds
the Phase 4 unified Audit page.
"""

from django.conf import settings
from django.core.cache import cache
from django.db import models


class SingletonModel(models.Model):
    """Abstract single-row table (pk always 1) with a cached accessor.

    Subclasses live in the app that owns their consumer (locality), so no new
    cross-app dependency is introduced. Use `cached()` on hot paths and
    `get_solo()` when you need the live row (e.g. the admin RetrieveUpdate view).
    """

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
        """Read the singleton from cache, populating it on a miss.

        Busted on every save, so it can back consumers on the 15-min pipeline
        without serving stale config.
        """
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
    """Append-only audit of config/settings/ops changes lacking a domain log.

    `target` is a human label for the touched surface (e.g. "Retention Policy",
    "risk-config #4"); `field`/`old_value`/`new_value` are blank for whole-object
    actions like a manual pipeline run.
    """

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
