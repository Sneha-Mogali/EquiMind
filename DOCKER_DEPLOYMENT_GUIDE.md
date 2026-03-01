# EquiMind Docker Deployment Guide

This guide provides comprehensive instructions for deploying EquiMind using Docker with proper security configurations.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git (for cloning the repository)
- Windows 10/11 or Windows Server

### 1. Setup Secrets (First Time Only)
```bash
# Run the secrets setup script
setup-secrets.bat
# or
setup-secrets.ps1
```

### 2. Deploy Services
```bash
# Deploy both backend and frontend
deploy-docker.bat
# or
deploy-docker.ps1
```

### 3. Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Manual Deployment

### Step 1: Prepare Secrets
Create the secrets directory and files:
```bash
mkdir secrets
echo "your-supabase-url" > secrets/supabase_url.txt
echo "your-supabase-key" > secrets/supabase_key.txt
```

### Step 2: Build Images
```bash
# Build backend image
docker-compose build backend

# Build frontend image
docker-compose build frontend
```

### Step 3: Start Services
```bash
# Start all services in detached mode
docker-compose up -d

# Or start with logs visible
docker-compose up
```

## 🔒 Security Features

### Image Security
- **Non-root users**: Both images run as non-root users
- **Minimal base images**: Using slim Python and Alpine Linux
- **Security updates**: Automatic security updates during build
- **Resource limits**: CPU and memory limits configured
- **Health checks**: Built-in health monitoring

### Secrets Management
- **Docker secrets**: Sensitive data stored as Docker secrets
- **File-based secrets**: Secrets read from secure files
- **No environment exposure**: Secrets not exposed in environment variables

### Network Security
- **Custom network**: Isolated Docker network
- **Port restrictions**: Only necessary ports exposed
- **Internal communication**: Services communicate internally

### Container Security
- **Read-only filesystems**: Where possible
- **Capability dropping**: Minimal Linux capabilities
- **User namespaces**: Proper user isolation

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-logs.bat all

# Backend only
docker-logs.bat backend

# Frontend only
docker-logs.bat frontend
```

### Check Status
```bash
# Comprehensive status check
docker-status.bat

# Quick status
docker-compose ps
```

### Resource Monitoring
```bash
# Real-time resource usage
docker stats

# Container health
docker-compose ps
```

## 🛠️ Management Commands

### Start/Stop Services
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Stop and remove everything
docker-compose down --volumes --remove-orphans
```

### Update Images
```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean Up
```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup (careful!)
docker system prune -a
```

## 🔍 Security Scanning

### Run Security Scan
```bash
# Comprehensive security scan
docker-security-scan.bat
```

This will:
- Scan images for vulnerabilities using Trivy
- Run Docker Bench Security tests
- Check for common security issues

## 🐛 Troubleshooting

### Common Issues

#### Docker Not Running
```
Error: Docker is not running
Solution: Start Docker Desktop
```

#### Port Already in Use
```
Error: Port 3000/8000 already in use
Solution: Stop other services or change ports in docker-compose.yml
```

#### Secrets Not Found
```
Error: secrets/supabase_url.txt not found
Solution: Run setup-secrets.bat first
```

#### Build Failures
```
Error: Build failed
Solution: Check Docker logs and ensure all dependencies are available
```

### Debug Commands
```bash
# Check container logs
docker-compose logs [service-name]

# Execute shell in container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check container processes
docker-compose top

# Inspect container configuration
docker inspect [container-name]
```

## 📁 File Structure

```
equimind/
├── backend/
│   ├── Dockerfile              # Backend Docker image
│   ├── requirements.txt        # Python dependencies
│   └── ...
├── frontend/
│   ├── Dockerfile              # Frontend Docker image
│   ├── nginx.conf              # Nginx configuration
│   └── ...
├── secrets/
│   ├── supabase_url.txt        # Supabase URL (create this)
│   └── supabase_key.txt        # Supabase key (create this)
├── docker-compose.yml          # Main orchestration file
├── deploy-docker.bat           # Windows deployment script
├── deploy-docker.ps1           # PowerShell deployment script
├── setup-secrets.bat           # Secrets setup script
└── .dockerignore               # Docker ignore file
```

## 🔧 Configuration

### Environment Variables
Backend environment variables are configured in `docker-compose.yml`:
- `EVENT_INTERVAL_SECONDS`: Event generation interval
- `AUTO_REMOVE_HONEYPOT_HOURS`: Honeypot cleanup interval
- `MODEL_PATH`: ML model directory
- `BULK_INSERT_SIZE`: Batch insert size

### Resource Limits
Configured in `docker-compose.yml`:
- Backend: 2 CPU cores, 4GB RAM
- Frontend: 1 CPU core, 512MB RAM

### Health Checks
- Backend: HTTP health endpoint check
- Frontend: Nginx status check
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## 🚀 Production Considerations

### For Production Deployment:
1. **Use external secrets management** (Azure Key Vault, AWS Secrets Manager)
2. **Configure reverse proxy** (nginx, Traefik)
3. **Set up SSL/TLS certificates**
4. **Configure log aggregation** (ELK stack, Fluentd)
5. **Set up monitoring** (Prometheus, Grafana)
6. **Configure backup strategies**
7. **Implement CI/CD pipelines**

### Security Hardening:
1. **Regular security scans**
2. **Image vulnerability management**
3. **Network segmentation**
4. **Access control and authentication**
5. **Audit logging**
6. **Incident response procedures**

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review container logs using `docker-logs.bat`
3. Check system status with `docker-status.bat`
4. Run security scan with `docker-security-scan.bat`

For additional help, refer to the main project documentation or create an issue in the project repository.