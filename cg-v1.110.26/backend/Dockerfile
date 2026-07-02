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

# Install from the fully pinned lock so every build is reproducible —
# unpinned installs let prod silently jump framework versions (fastapi
# 0.136→0.139 broke route introspection on 2026-07-02). requirements.txt
# stays as the human-edited direct-dependency list; regenerate the lock
# after changing it (instructions in requirements.lock header).
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Create startup script that handles migrations gracefully
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting CommonGround API..."\n\
echo "PORT=$PORT"\n\
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"\n\
echo "SECRET_KEY set: $([ -n "$SECRET_KEY" ] && echo YES || echo NO)"\n\
echo "SUPABASE_URL set: $([ -n "$SUPABASE_URL" ] && echo YES || echo NO)"\n\
echo "Running database migrations (60s timeout)..."\n\
timeout 60 alembic upgrade head 2>&1 && echo "Migrations complete!" || echo "Migration warning (skipped or already applied)"\n\
echo "Starting uvicorn on port ${PORT:-8000}..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --loop uvloop --no-access-log --limit-concurrency 120 --timeout-keep-alive 10 --proxy-headers --forwarded-allow-ips="*" --log-level warning\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run application
CMD ["/app/start.sh"]
