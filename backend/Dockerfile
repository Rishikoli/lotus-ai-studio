# Dockerfile for Lotus AI Studio backend.
# Runs FastAPI with uvicorn on Cloud Run.
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

# Start uvicorn — workers=1 to preserve MemorySaver singleton
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1"]
