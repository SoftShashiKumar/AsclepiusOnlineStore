
# FROM python:3.11-slim

# RUN apt-get update && apt-get install -y \
#     build-essential \
#     default-libmysqlclient-dev \
#     pkg-config \
#     libcairo2-dev \
#     libpango1.0-dev \
#     libgdk-pixbuf-2.0-0 \
#     shared-mime-info \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy dependencies & install
# COPY backend/requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy all project files
# COPY . .

# # Set PYTHONPATH
# ENV PYTHONPATH=/app/backend

# WORKDIR /app/backend

# # Expose port and bind Gunicorn dynamically to $PORT (default to 8000 if not set)
# ENV PORT=8000
# EXPOSE ${PORT}

# CMD gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT}

FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app/backend

WORKDIR /app/backend

# Collect static files automatically
RUN python manage.py collectstatic --noinput

ENV PORT=8000
EXPOSE ${PORT}

CMD sh -c "python manage.py migrate && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT}"