FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Create startup script that handles migrations gracefully
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting CommonGround API..."\n\
echo "Running database migrations..."\n\
alembic upgrade head || echo "Migration failed or no changes needed"\n\
echo "Starting uvicorn..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run application
CMD ["/app/start.sh"]
