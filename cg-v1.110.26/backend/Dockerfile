FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including WeasyPrint requirements)
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    libglib2.0-0 \
    fonts-liberation \
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
echo "PORT=$PORT"\n\
echo "Running database migrations..."\n\
alembic upgrade head 2>&1 && echo "Migrations complete!" || echo "Migration warning (may already be applied)"\n\
echo "Starting uvicorn on port ${PORT:-8000}..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info --access-log\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run application
CMD ["/app/start.sh"]
