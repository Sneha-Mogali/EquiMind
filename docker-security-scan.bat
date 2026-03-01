@echo off
REM EquiMind Docker Security Scan Script
REM This script performs security scans on the Docker images

echo ========================================
echo EquiMind Docker Security Scan
echo ========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Building images for security scan...
docker-compose build --no-cache

echo [2/4] Scanning backend image for vulnerabilities...
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ^
    -v %cd%:/tmp/app ^
    aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL ^
    equimind-backend:latest

echo [3/4] Scanning frontend image for vulnerabilities...
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ^
    -v %cd%:/tmp/app ^
    aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL ^
    equimind-frontend:latest

echo [4/4] Running Docker Bench Security (if available)...
docker run --rm --net host --pid host --userns host --cap-add audit_control ^
    -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST ^
    -v /etc:/etc:ro ^
    -v /usr/bin/containerd:/usr/bin/containerd:ro ^
    -v /usr/bin/runc:/usr/bin/runc:ro ^
    -v /usr/lib/systemd:/usr/lib/systemd:ro ^
    -v /var/lib:/var/lib:ro ^
    -v /var/run/docker.sock:/var/run/docker.sock:ro ^
    --label docker_bench_security ^
    docker/docker-bench-security 2>nul || echo Docker Bench Security not available

echo.
echo ========================================
echo Security Scan Complete!
echo ========================================
echo Review the output above for any security issues
echo Consider updating base images if vulnerabilities found
echo ========================================

pause