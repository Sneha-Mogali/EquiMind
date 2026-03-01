# EquiMind Backend - Secure Docker Image
FROM python:3.10-slim

# Security: Set labels for better image management
LABEL maintainer="EquiMind Team"
LABEL version="1.0"
LABEL description="EquiMind Backend Service"

# Security: Create non-root user with specific UID/GID
RUN groupadd -r -g 1001 equimind && \
    useradd -r -u 1001 -g equimind -m -s /bin/bash equimind

# Security: Set working directory
WORKDIR /app

# Security: Install system dependencies with minimal packages and security updates
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    gcc \
    g++ \
    curl \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Security: Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Security: Create necessary directories and set permissions
RUN mkdir -p /app/models /app/logs /app/data /app/secrets && \
    chown -R equimind:equimind /app && \
    chmod -R 755 /app && \
    chmod 700 /app/secrets

# Security: Switch to non-root user
USER equimind

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Security: Use exec form and run with proper signal handling
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--access-log"]