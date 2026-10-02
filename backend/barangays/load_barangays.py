from django.contrib.gis.gdal import DataSource
from .models import Barangay

# Loads Zamboanga City barangays (province code PH0907332) from the GDB, layer 4.
def load_barangays():
    path = '/backend/phl_admin_boundaries.gdb'
    ds = DataSource(path)
    layer = ds[4]

    zamboanga_features = [
        f for f in layer
        if f.get('adm3_pcode') == 'PH0907332'
    ]

    for feature in zamboanga_features:
        Barangay.objects.get_or_create(
            code = feature.get('adm4_pcode'),
            defaults={
                'name': feature.get('adm4_name'),
                'province_code': feature.get('adm3_pcode'),
                'area_square_km': feature.get('area_sqkm'),
                'boundary': feature.geom.wkt,
            }
        )

    print(f"Loaded {len(zamboanga_features)} barangays!")

