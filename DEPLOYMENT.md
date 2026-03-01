# EquiMind Deployment Guide

## Quick Deploy (Development)

### Option 1: Automated Launcher (Recommended)

**Windows:**
```bash
launch-equimind.bat
```

**PowerShell:**
```powershell
.\launch-equimind.ps1
```

### Option 2: Manual Start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

### Backend (FastAPI)

#### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
pip install gunicorn  # Production server
```

#### 2. Environment Configuration

Create `.env` file:
```bash
MODEL_PATH=models/
EVENT_INTERVAL_SECONDS=3
```

#### 3. Run with Gunicorn

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

**Options:**
- `-w 4` - 4 worker processes
- `-k uvicorn.workers.UvicornWorker` - Async worker class
- `--bind 0.0.0.0:8000` - Listen on all interfaces

#### 4. Systemd Service (Linux)

Create `/etc/systemd/system/equimind-backend.service`:

```ini
[Unit]
Description=EquiMind Backend API
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/equimind/backend
Environment="PATH=/opt/equimind/venv/bin"
ExecStart=/opt/equimind/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable equimind-backend
sudo systemctl start equimind-backend
```

### Frontend (React)

#### 1. Build for Production

```bash
cd frontend
npm install
npm run build
```

This creates `dist/` directory with optimized static files.

#### 2. Serve with Nginx

Install Nginx:
```bash
sudo apt install nginx  # Ubuntu/Debian
```

Create `/etc/nginx/sites-available/equimind`:

```nginx
server {
    listen 80;
    server_name equimind.example.com;
    
    root /opt/equimind/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/equimind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Monitoring (Optional)

#### Docker Compose

```bash
cd risk_engine
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- Prometheus on port 9090
- Grafana on port 3001

#### Manual Prometheus

1. Download from https://prometheus.io/download/
2. Copy `risk_engine/prometheus.yml` to Prometheus directory
3. Run: `prometheus --config.file=prometheus.yml`

## Docker Deployment

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
```

Build and run:
```bash
docker build -t equimind-backend ./backend
docker run -p 8000:8000 equimind-backend
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Full Stack)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MODEL_PATH=models/
      - EVENT_INTERVAL_SECONDS=3
    volumes:
      - ./backend/models:/app/models
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./risk_engine/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./risk_engine/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

## Cloud Deployment

### AWS

#### EC2 Deployment

1. Launch EC2 instance (t3.medium or larger)
2. Install dependencies:
```bash
sudo apt update
sudo apt install python3-pip nodejs npm nginx
```

3. Clone repository and deploy as per production steps above

#### ECS Deployment

1. Push Docker images to ECR
2. Create ECS task definitions
3. Deploy to ECS cluster
4. Configure ALB for load balancing

### Azure

#### App Service

1. Create App Service for backend (Python)
2. Create Static Web App for frontend
3. Configure environment variables
4. Deploy via GitHub Actions or Azure CLI

### Google Cloud

#### Cloud Run

1. Build and push Docker images to GCR
2. Deploy backend to Cloud Run
3. Deploy frontend to Cloud Storage + Cloud CDN
4. Configure Cloud Load Balancer

## Security Considerations

### Backend

1. **CORS Configuration**
   - Update `allow_origins` in `main.py` to specific domains
   - Remove `["*"]` in production

2. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management (AWS Secrets Manager, Azure Key Vault)

3. **API Authentication**
   - Add JWT authentication
   - Implement rate limiting
   - Use API keys for external access

4. **HTTPS**
   - Use Let's Encrypt for SSL certificates
   - Configure Nginx with SSL
   - Redirect HTTP to HTTPS

### Frontend

1. **Environment Variables**
   - Use `.env.production` for production API URLs
   - Never expose sensitive keys in frontend

2. **Content Security Policy**
   - Add CSP headers in Nginx
   - Restrict script sources

## Performance Optimization

### Backend

1. **Caching**
   - Add Redis for event caching
   - Cache ML predictions

2. **Database**
   - Add PostgreSQL for persistent storage
   - Index frequently queried fields

3. **Load Balancing**
   - Use multiple Gunicorn workers
   - Deploy behind load balancer

### Frontend

1. **Build Optimization**
   - Enable code splitting
   - Optimize bundle size
   - Use CDN for static assets

2. **Caching**
   - Configure browser caching
   - Use service workers

## Monitoring & Logging

### Application Logs

**Backend:**
```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('equimind.log'),
        logging.StreamHandler()
    ]
)
```

### Metrics

- Prometheus metrics at `/metrics`
- Grafana dashboards for visualization
- Alert rules for critical events

### Health Checks

**Backend:**
```bash
curl http://localhost:8000/status
```

**Expected Response:**
```json
{
  "status": "online",
  "timestamp": "2026-02-28T...",
  "tension": 35.2,
  "total_events": 150,
  "blocks": 5,
  "challenges": 12,
  "active_connections": 3,
  "model_version": "2.0.0"
}
```

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process
lsof -i :8000
# Kill process
kill -9 <PID>
```

**ML models not loading:**
- Check `MODEL_PATH` environment variable
- Verify model files exist in `backend/models/`
- System will fallback to simulation mode

**High memory usage:**
- Reduce Gunicorn workers
- Optimize TensorFlow memory usage
- Add swap space

### Frontend Issues

**Build fails:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**WebSocket connection failed:**
- Check backend is running
- Verify CORS configuration
- Check firewall rules

## Backup & Recovery

### Database Backup

```bash
# If using PostgreSQL
pg_dump equimind > backup.sql
```

### Model Backup

```bash
tar -czf models-backup.tar.gz backend/models/
```

### Configuration Backup

```bash
tar -czf config-backup.tar.gz .env risk_engine/*.yml
```

## Scaling

### Horizontal Scaling

1. Deploy multiple backend instances
2. Use load balancer (Nginx, HAProxy, AWS ALB)
3. Share state via Redis
4. Use message queue for events (RabbitMQ, Kafka)

### Vertical Scaling

1. Increase EC2 instance size
2. Add more CPU/RAM
3. Optimize TensorFlow for GPU

## Maintenance

### Updates

```bash
# Backend
cd backend
pip install -r requirements.txt --upgrade

# Frontend
cd frontend
npm update
```

### Log Rotation

Configure logrotate:
```bash
/opt/equimind/backend/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

---

**Deployment complete! 🚀**

For support, see README.md or ARCHITECTURE.md
