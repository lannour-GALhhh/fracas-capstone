# Pinned to trixie: the GDAL runtime package below is named per Debian release
# (libgdal36 on trixie), so an implicit base-image release bump would break it.
FROM python:3.12-slim-trixie

WORKDIR /backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# GeoDjango loads GDAL/GEOS through ctypes, so it needs the runtime shared
# libraries only -- not the dev headers and not the Debian osgeo bindings.
# libgdal36 pulls libgeos-c in transitively.
#   - libgdal-dev  (~600MB) would only be needed to compile against GDAL; nothing here does.
#   - python3-gdal (~180MB) installs osgeo into Debian's /usr/bin/python3, which is
#     not this image's interpreter, so it was unimportable dead weight regardless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal36 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python3", "manage.py", "runserver"]
