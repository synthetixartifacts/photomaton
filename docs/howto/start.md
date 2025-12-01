# Photomaton - Quick Start Guide

## Starting the Application

### Prerequisites
- ✅ Docker Desktop installed and running
- ✅ Project cloned and configured (see [install.md](./install.md))
- ✅ `.env` file configured

---

## Quick Start Commands

### 1. Start Everything (Recommended)
```bash
# Navigate to project directory
cd photomaton

# Build and start all services
docker compose up --build
```

### 2. Start in Background
```bash
# Start detached (runs in background)
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 3. Development Mode (Optional)
```bash
# Start with development profile
docker compose --profile dev up --build
```

---

## What Happens When You Start

### 1. Docker Build Process
```
🔨 Building Docker images...
📦 Installing dependencies (340+ packages)
🔄 Compiling TypeScript
🏗️ Building React client
📱 Building Express server
✅ Ready to start!
```

### 2. Server Startup
```
🚀 Starting Photomaton server...
📊 Running database migrations...
✅ Provider 'mock' validated
🌐 Server running on port 8080
```

### 3. Application Ready
```
✅ Application ready at: https://localhost:8443/
✅ API health check: https://localhost:8443/api/healthz
✅ API docs: https://localhost:8443/api
```

---

## Accessing the Application

### Main Application
- **URL**: https://localhost:8443/
- **What you'll see**: React frontend with camera interface
- **Status check**: Look for green "System is healthy" message

### Example Health Check Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T23:05:00.000Z",
  "provider": "mock",
  "version": "0.1.0"
}
```

---

## Common Startup Commands

### Basic Operations
```bash
# Start application
docker compose up --build

# Stop application
docker compose down

# Restart application
docker compose restart

# View real-time logs
docker compose logs -f

# View logs for specific service
docker compose logs app
```

### Debugging Commands
```bash
# Access container shell
docker exec -it photomaton-app sh

# Check container status
docker compose ps

# View container resource usage
docker stats photomaton-app

# Inspect container details
docker inspect photomaton-app
```

### Database Commands
```bash
# Access SQLite database
docker exec -it photomaton-app sqlite3 /data/photomaton.db

# Common database queries
docker exec photomaton-app sqlite3 /data/photomaton.db ".tables"
docker exec photomaton-app sqlite3 /data/photomaton.db "SELECT * FROM photos;"
```

---

## Port Configuration

### Default Ports
- **Application**: 8080
- **Development Server**: 3000 (if using dev profile)

### Changing Ports
```bash
# Method 1: Edit .env file
echo "PORT=8081" >> .env
docker compose up --build

# Method 2: Environment override
PORT=8081 docker compose up --build

# Method 3: Docker compose override
# Create docker-compose.override.yml:
version: '3.8'
services:
  app:
    ports:
      - "8081:8080"
```

---

## Environment Modes

### Production Mode (Default)
```bash
# Uses built React app, optimized
docker compose up --build
```

### Development Mode
```bash
# Hot reload, dev tools enabled
docker compose --profile dev up --build
```

### Configuration Check
```bash
# View current environment
docker exec photomaton-app printenv | grep NODE_ENV
docker exec photomaton-app printenv | grep IMAGE_PROVIDER
```

---

## Testing the Application

### 1. Quick Health Check
```bash
# Test if server is responding
curl -k https://localhost:8443/api/healthz

# Expected response:
# {"status":"healthy","timestamp":"...","provider":"mock","version":"0.1.0"}
```

### 2. Browser Test
1. Open: https://localhost:8443
2. Look for: "✅ System is healthy" message
3. Check: Provider and version information displayed

### 3. Camera Test (Manual)
1. Allow camera permissions when prompted
2. Camera preview should appear
3. Test capture button functionality

---

## Data Persistence

### Data Locations
```bash
# Photos stored in Docker volume
docker volume ls | grep photomaton

# View stored photos
docker exec photomaton-app ls -la /data/photos/

# Database location
docker exec photomaton-app ls -la /data/photomaton.db
```

### Backup Data
```bash
# Backup photos
docker cp photomaton-app:/data/photos ./backup-photos

# Backup database
docker cp photomaton-app:/data/photomaton.db ./backup.db
```

### Reset Data
```bash
# Stop and remove all data
docker compose down -v

# Start fresh
docker compose up --build
```

---

## Performance Monitoring

### Container Resources
```bash
# Monitor real-time resource usage
docker stats photomaton-app

# View container processes
docker exec photomaton-app ps aux
```

### Application Logs
```bash
# Follow application logs
docker compose logs -f app

# Filter by log level
docker compose logs app | grep ERROR
docker compose logs app | grep INFO
```

### Health Monitoring
```bash
# Continuous health check
watch -n 5 'curl -s https://localhost:8443/api/healthz | jq'

# Database check
docker exec photomaton-app sqlite3 /data/photomaton.db "PRAGMA integrity_check;"
```

---

## Troubleshooting Startup Issues

### Problem: Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or use different port
PORT=8081 docker compose up --build
```

### Problem: Docker Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache

# Check Docker daemon
docker info
```

### Problem: Container Crashes
```bash
# Check container logs
docker compose logs app

# Check container exit code
docker compose ps

# Restart with debug output
DEBUG=* docker compose up --build
```

### Problem: Database Issues
```bash
# Check database file permissions
docker exec photomaton-app ls -la /data/

# Reset database
docker exec photomaton-app rm -f /data/photomaton.db
docker compose restart
```

### Problem: Camera Not Working
1. **Check browser permissions**: Allow camera access
2. **HTTPS requirement**: Use `localhost` (exempt from HTTPS)
3. **Multiple tabs**: Close other tabs using camera
4. **Browser compatibility**: Try Chrome/Firefox

---

## Performance Tips

### Faster Startup
```bash
# Use cached build
docker compose up

# Skip rebuild if no changes
docker compose start
```

### Resource Optimization
```bash
# Limit container memory
docker compose up --build --memory=2g

# Check resource usage
docker stats --no-stream photomaton-app
```

---

## Development Workflow

### Code Changes
1. Make changes to source code
2. Rebuild and restart:
   ```bash
   docker compose up --build
   ```

### Quick Testing
```bash
# Test API endpoints
curl -k https://localhost:8443/api/healthz
curl -k https://localhost:8443/api/ready

# Test frontend
open https://localhost:8443
```

### Debugging
```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> .env
docker compose up --build

# Access container for debugging
docker exec -it photomaton-app sh
```

---

## Next Steps

After successful startup:

1. **Test the application**: Try capturing and transforming photos
2. **Read the user guide**: [RUN_GUIDE.md](./RUN_GUIDE.md)
3. **Configure AI providers**: Add Gemini API key for real transformations
4. **Customize settings**: Modify `.env` for your needs

---

## Quick Reference

### Essential Commands
```bash
# Start
docker compose up --build

# Stop
docker compose down

# Logs
docker compose logs -f

# Health
curl -k https://localhost:8443/api/healthz

# Shell access
docker exec -it photomaton-app sh
```

### URLs
- **App**: https://localhost:8443
- **Health**: https://localhost:8443/api/healthz
- **API**: https://localhost:8443/api

Application started successfully! 🎉