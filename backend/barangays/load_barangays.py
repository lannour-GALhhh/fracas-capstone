from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.gdal import DataSource, GDALRaster
from .models import Barangay
import numpy as np
import logging

logger = logging.getLogger(__name__)

"""

This is a data cleaning/storage code. 
This will fetch barangays only assigned to Zamboanga City using the provincial code PH0907332. 
This will fetch the geopackage, assign it as a DataSource from gis.gdal, then only get the layer 4
which is for individual barangays.

We will get Zamboanga City's barangay features and assign them into an array by matching their provincial code (pcode).

We will iterate through each of the barangays. We will use the get_or_create feature of Django objects
to either iterate if exisiting or create using the required features (excluding land_height) if not, 
removing redundancy errors if we run this again. We will store them in our Barangay models through iterations.

We will run this script/code through: 

docker exec -it django_backend python3 manage.py shell < /backend/barangays/load_barangays.py

"""

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


def load_elevations(raster_path='/backend/rasters_COP30/output_hh.tif'):
    raster = GDALRaster(raster_path)
    band = raster.bands[0]
    data = np.array(band.data())

    x_min, y_min, x_max, y_max = raster.extent

    def get_elevation_stats(barangay):
        barangay_box = barangay.boundary.extent

        col_min = int((barangay_box[0] - x_min) / (x_max - x_min) * raster.width)
        col_max = int((barangay_box[2] - x_min) / (x_max - x_min) * raster.width)
        row_min = int((y_max - barangay_box[3]) / (y_max - y_min) * raster.height)
        row_max = int((y_max - barangay_box[1]) / (y_max - y_min) * raster.height)

        col_min = max(0, col_min)
        col_max = min(raster.width - 1, col_max)
        row_min = max(0, row_min)
        row_max = min(raster.height - 1, row_max)

        subset = data[row_min:row_max+1, col_min:col_max+1]
        subset = subset[subset > -9999]

        if subset.size == 0:
            return None, None, None
        
        return float(np.mean(subset)), float(np.min(subset)), float(np.max(subset))
    
    barangays = Barangay.objects.all()
    updated = 0

    for barangay in barangays:
        try:
            mean_elev, min_elev, max_elev = get_elevation_stats(barangay)

            if mean_elev is None:
                logger.warning(f"No elevation data for: {barangay.name}")
                continue

            barangay.land_height_mean = mean_elev
            barangay.land_height_min = min_elev
            barangay.land_height_max = max_elev
            barangay.save()
            updated += 1

            logger.info(f"Saved barangay {barangay.name} land height information.\tMean: {mean_elev}\tMin: {min_elev}\tMax: {max_elev}")
            
        except Exception as e:
            print(f"Failed to save barangay {barangay.name}: {e}")
            continue

    print(f"Updated barangay land height elevation for {updated} barangays")

