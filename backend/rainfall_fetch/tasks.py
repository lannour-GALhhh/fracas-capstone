import requests
import logging

from celery import shared_task

from django.utils import timezone

from barangays.models import Barangay
from .models import Rainfall

logger = logging.getLogger(__name__)

def rainfall_url(latitude: float, longitude: float) -> str:
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}&longitude={longitude}"
        f"&current=precipitation&hourly=precipitation&forecast_days=1"
    )

def parse_rainfall_data(data, barangay_name=None):
    current_rainfall = data['current']['precipitation']
    current_hour = data['current']['time'][:13]
    times = data['hourly']['time']
    precipitation = data['hourly']['precipitation']

    index = next((i for i, t in enumerate(times) if t.startswith(current_hour)), None)

    if index is None:
        logger.warning(f"Current hour not found in hourly forecast for {barangay_name}. Defaulting to 0")
        return {key: 0 for key in [
            'current_rainfall_strength', 
            'forecast_strength_1hr', 
            'forecast_strength_2hr', 
            'forecast_strength_3hr', 
            'forecast_strength_4hr'
            ]}

    # 1 hand function to get the precipitation based on hour represented as index, which is 1, 2, 3, 4
    forecast = lambda x: precipitation[index + x] if index + x < len(precipitation) else 0 

    return {
        'current_rainfall_strength': current_rainfall,
        'forecast_strength_1hr': forecast(1),
        'forecast_strength_2hr': forecast(2),
        'forecast_strength_3hr': forecast(3),
        'forecast_strength_4hr': forecast(4),
    }

@shared_task
def fetch_rainfall_information():
    barangays = Barangay.objects.all()
    timestamp = timezone.now()
    readings = []

    for barangay in barangays:
        try:

            centroid = barangay.boundary.centroid # get the coordinates from each barangays

            # fetch data from api
            response = requests.get(
                rainfall_url(centroid.y, centroid.x), # rainfall url expects latitude (y) and longitude (x)
                timeout=10 
            )
            response.raise_for_status()

            # clean data
            parsed_data = parse_rainfall_data(response.json(), barangay.name)

            readings.append(Rainfall(
                barangay=barangay,
                recorded_at=timestamp,
                **parsed_data
            ))

            logger.info(f"Fetched rainfall information for {barangay.name}: {parsed_data}")
        except Exception as e:
            logger.error(f"Failed to fetch rainfall information for: {barangay.name}: {e}")
            continue


    # store data using model
    if readings:
        Rainfall.objects.bulk_create(readings)
        logger.info(f"Stored {len(readings)} rainfall readings.")