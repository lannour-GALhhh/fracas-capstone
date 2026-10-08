"""Admin endpoints to upload GIS layers and follow their processing."""

from django.db.models import Count, Max
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import log_change
from users.permissions import IsAdmin

from .models import Barangay, BarangaySusceptibility, GisImport
from .tasks import import_dir, process_gis_import

MAX_UPLOAD_BYTES = 200 * 1024 * 1024


class GisImportSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = GisImport
        fields = ["id", "kind", "status", "filename", "message", "result", "created_by", "created_at", "finished_at"]

    def get_created_by(self, obj):
        return obj.created_by.get_username() if obj.created_by else None


class GisImportUploadSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=[c for c in GisImport.Kind.choices if c[0] != GisImport.Kind.STREETS])
    file = serializers.FileField()

    def validate_file(self, value):
        if not value.name.lower().endswith(".zip"):
            raise serializers.ValidationError("Upload a .zip archive.")
        if value.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("File exceeds the 200 MB limit.")
        return value


class GisImportListCreateView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser]

    def get(self, request):
        return Response(GisImportSerializer(GisImport.objects.select_related("created_by")[:20], many=True).data)

    def post(self, request):
        form = GisImportUploadSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        kind, upload = form.validated_data["kind"], form.validated_data["file"]

        if GisImport.objects.filter(status__in=[GisImport.Status.PENDING, GisImport.Status.RUNNING]).exists():
            return Response({"detail": "Another import is still processing."}, status=status.HTTP_409_CONFLICT)

        job = GisImport.objects.create(kind=kind, filename=upload.name[:255], created_by=request.user)
        folder = import_dir(job.pk)
        folder.mkdir(parents=True, exist_ok=True)
        with open(folder / "upload.zip", "wb") as out:
            for chunk in upload.chunks():
                out.write(chunk)

        log_change(request.user, "GIS data", action="gis_import", field=kind, new_value=upload.name)
        process_gis_import.delay(job.pk)
        return Response(GisImportSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class DetectStreetsView(APIView):
    """Start detecting the named streets that cross high / very high flood zones."""

    permission_classes = [IsAdmin]

    def post(self, request):
        if GisImport.objects.filter(status__in=[GisImport.Status.PENDING, GisImport.Status.RUNNING]).exists():
            return Response({"detail": "Another import is still processing."}, status=status.HTTP_409_CONFLICT)
        job = GisImport.objects.create(
            kind=GisImport.Kind.STREETS, filename="OpenStreetMap (Overpass)", created_by=request.user
        )
        log_change(request.user, "GIS data", action="gis_import", field=job.kind, new_value=job.filename)
        process_gis_import.delay(job.pk)
        return Response(GisImportSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class GisImportDetailView(RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = GisImport.objects.select_related("created_by")
    serializer_class = GisImportSerializer



# Layers loaded by the CLI (no upload record) are reported under their seed source name.
SEED_SOURCES = {
    GisImport.Kind.BOUNDARY: "phl_admin_boundaries.gdb",
    GisImport.Kind.SUSCEPTIBILITY: "ZAM_FLOOD.shp",
}


def _active_layer(kind, loaded_count, loaded_at=None):
    """The file currently feeding `kind`: the latest successful upload, else the seed source, else None."""
    latest = GisImport.objects.filter(kind=kind, status=GisImport.Status.SUCCEEDED).first()
    uploaded_is_current = latest and (loaded_at is None or latest.finished_at >= loaded_at)
    if uploaded_is_current:
        return {"filename": latest.filename, "in_use_since": latest.finished_at, "source": "upload", "records": loaded_count}
    if loaded_count:
        return {"filename": SEED_SOURCES[kind], "in_use_since": loaded_at, "source": "seed", "records": loaded_count}
    return None


class ActiveGisLayersView(APIView):
    """Which file backs each layer right now, and since when."""

    permission_classes = [IsAdmin]

    def get(self, request):
        zones = BarangaySusceptibility.objects.aggregate(n=Count("id"), at=Max("loaded_at"))
        return Response({
            GisImport.Kind.BOUNDARY: _active_layer(GisImport.Kind.BOUNDARY, Barangay.objects.count()),
            GisImport.Kind.SUSCEPTIBILITY: _active_layer(GisImport.Kind.SUSCEPTIBILITY, zones["n"], zones["at"]),
        })
