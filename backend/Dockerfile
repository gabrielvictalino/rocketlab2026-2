FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN pip install . \
    && useradd --create-home --uid 10001 app \
    && mkdir /data \
    && chown app:app /data

COPY alembic.ini ./
COPY migrations ./migrations
COPY data ./seed-data
USER app
EXPOSE 8000
CMD ["sh", "-c", "python -m alembic upgrade head && exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
