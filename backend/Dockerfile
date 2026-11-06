FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app/hivision-overlay:/app/hivision-core \
    IDPHOTO_DATA_DIR=/data \
    GRADIO_ANALYTICS_ENABLED=False

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt constraints-api.txt ./
COPY hivision-core/requirements.txt hivision-core/requirements-app.txt ./hivision-core/
RUN pip install --no-cache-dir -r requirements.txt && pip check \
    && pip freeze --all > /app/requirements.resolved.txt

# Models are verified by size and SHA-256 and cached in the image layer.
COPY scripts/download_models.py ./scripts/download_models.py
RUN python scripts/download_models.py --models all

COPY hivision-core/hivision/ ./hivision-core/hivision/
COPY hivision-overlay/*.py ./hivision-overlay/
COPY hivision-overlay/miniapp_admin.html hivision-overlay/miniapp_admin.css hivision-overlay/miniapp_admin.js ./hivision-overlay/
# Import smoke catches missing resources/dependencies before shipping an image.
RUN python -c "import deploy_api, miniapp_push, miniapp_admin"

WORKDIR /app/hivision-overlay
EXPOSE 8080 8092
CMD ["python", "-m", "uvicorn", "deploy_api:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--no-access-log", "--no-proxy-headers"]
