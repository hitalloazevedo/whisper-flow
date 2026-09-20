FROM python:3.11-slim

# ctranslate2 (faster-whisper's inference engine) needs libgomp at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=3 \
    CMD python -c "import os,sys,urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"HEALTH_PORT\", \"8000\")}/health', timeout=2)" || exit 1

CMD ["python", "-m", "worker.main"]
