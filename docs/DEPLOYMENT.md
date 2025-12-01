# Production Deployment Guide

> **Photomaton Production Deployment** - Complete guide for production environments

## Overview

Photomaton is designed for production deployment using Docker containers. This guide covers deployment strategies, security considerations, monitoring, and maintenance for production environments.

## Quick Production Start

### Minimal Production Setup
```bash
# 1. Clone and configure
git clone <repository-url>
cd photomaton
cp .env.example .env

# 2. Configure production environment
nano .env  # Update for production

# 3. Deploy with Docker
docker compose up -d --build

# 4. Verify deployment
curl https://localhost:8443/api/healthz
```

---

## Production Environment Configuration

### Environment Variables

#### Essential Production Settings
```bash
# Production Environment
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database & Storage (Persistent)
DATABASE_URL=file:/data/photomaton.db
UPLOAD_DIR=/data/photos
MAX_FILE_SIZE=10485760

# Security (REQUIRED)
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
SESSION_SECRET=your-cryptographically-secure-secret-here
RATE_LIMIT_MAX_REQUESTS=50

# AI Provider (Choose one)
IMAGE_PROVIDER=gemini-imagen
GEMINI_API_KEY=your-production-api-key

# Admin Authentication (RECOMMENDED)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$hash-of-your-secure-password
```

#### Security Checklist
- [ ] Change default `SESSION_SECRET`
- [ ] Set restrictive `CORS_ORIGIN`
- [ ] Enable admin authentication
- [ ] Use strong password hash
- [ ] Configure rate limiting
- [ ] Set up HTTPS certificates

### SSL/TLS Configuration

#### Self-Signed Certificates (Development/Internal)
```bash
# Generate certificates
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"

# Set permissions
chmod 600 certs/key.pem
chmod 644 certs/cert.pem
```

#### Production Certificates (Let's Encrypt)
```bash
# Using certbot (example for Ubuntu)
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy to project
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
sudo chown $USER:$USER certs/*.pem
```

#### Certificate Auto-Renewal
```bash
# Add to crontab
crontab -e

# Renew certificates monthly
0 2 1 * * sudo certbot renew --quiet && docker compose restart app
```

---

## Deployment Strategies

### Single Server Deployment

#### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: photomaton-prod
    ports:
      - "443:8080"    # HTTPS
      - "80:9080"     # HTTP redirect
    environment:
      - NODE_ENV=production
      - PORT=8080
      - DATABASE_URL=file:/data/photomaton.db
      - UPLOAD_DIR=/data/photos
      - LOG_LEVEL=warn
      - CORS_ORIGIN=${CORS_ORIGIN}
      - IMAGE_PROVIDER=${IMAGE_PROVIDER}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
    volumes:
      - ./data:/data
      - ./certs:/certs:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.25'

  # Log rotation service
  logrotate:
    image: linkyard/docker-logrotate
    volumes:
      - ./logs:/logs
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - LOGROTATE_INTERVAL=daily
      - LOGROTATE_SIZE=100M
      - LOGROTATE_COPIES=7
    restart: unless-stopped
```

#### Deployment Commands
```bash
# Production deployment
docker compose -f docker-compose.prod.yml up -d --build

# Update deployment
git pull
docker compose -f docker-compose.prod.yml up -d --build

# View production logs
docker compose -f docker-compose.prod.yml logs -f

# Backup before update
./scripts/backup.sh
```

### Multi-Server Deployment

#### Load Balancer Setup (Nginx)
```nginx
# /etc/nginx/sites-available/photomaton
upstream photomaton_backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name photomaton.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Upload size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://photomaton_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location /api/photos/ {
        proxy_pass http://photomaton_backend;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name photomaton.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Shared Storage Setup
```bash
# NFS shared storage for photos
sudo apt-get install nfs-common
sudo mkdir -p /mnt/photomaton-data

# Mount shared storage
sudo mount -t nfs 10.0.1.100:/exports/photomaton /mnt/photomaton-data

# Add to fstab for persistence
echo "10.0.1.100:/exports/photomaton /mnt/photomaton-data nfs defaults 0 0" | sudo tee -a /etc/fstab

# Update docker-compose volumes
volumes:
  - /mnt/photomaton-data:/data
```

---

## Container Orchestration

### Docker Swarm Deployment

#### Swarm Stack Configuration
```yaml
# photomaton-stack.yml
version: '3.8'

services:
  app:
    image: photomaton:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == worker
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.25'
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/photomaton.db
      - UPLOAD_DIR=/data/photos
    volumes:
      - photomaton_data:/data
      - photomaton_certs:/certs:ro
    networks:
      - photomaton_network

  nginx:
    image: nginx:alpine
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == manager
    ports:
      - "80:80"
      - "443:443"
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf
    volumes:
      - photomaton_certs:/certs:ro
    networks:
      - photomaton_network

volumes:
  photomaton_data:
    driver: nfs
    driver_opts:
      share: 10.0.1.100:/exports/photomaton
  photomaton_certs:
    external: true

networks:
  photomaton_network:
    driver: overlay
    attachable: true

configs:
  nginx_config:
    external: true
```

#### Swarm Deployment Commands
```bash
# Initialize swarm (on manager node)
docker swarm init

# Join worker nodes
docker swarm join --token <worker-token> <manager-ip>:2377

# Deploy stack
docker stack deploy -c photomaton-stack.yml photomaton

# Scale services
docker service scale photomaton_app=5

# Update service
docker service update --image photomaton:v2.0 photomaton_app
```

### Kubernetes Deployment

#### Kubernetes Manifests
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: photomaton
  labels:
    app: photomaton
spec:
  replicas: 3
  selector:
    matchLabels:
      app: photomaton
  template:
    metadata:
      labels:
        app: photomaton
    spec:
      containers:
      - name: photomaton
        image: photomaton:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "file:/data/photomaton.db"
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: photomaton-secrets
              key: gemini-api-key
        volumeMounts:
        - name: data-volume
          mountPath: /data
        - name: certs-volume
          mountPath: /certs
          readOnly: true
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /api/healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: photomaton-data-pvc
      - name: certs-volume
        secret:
          secretName: photomaton-tls

---
apiVersion: v1
kind: Service
metadata:
  name: photomaton-service
spec:
  selector:
    app: photomaton
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: photomaton-data-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: nfs-client

---
apiVersion: v1
kind: Secret
metadata:
  name: photomaton-secrets
type: Opaque
data:
  gemini-api-key: <base64-encoded-api-key>

---
apiVersion: v1
kind: Secret
metadata:
  name: photomaton-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

#### Kubernetes Deployment
```bash
# Apply manifests
kubectl apply -f k8s/

# Scale deployment
kubectl scale deployment photomaton --replicas=5

# Update image
kubectl set image deployment/photomaton photomaton=photomaton:v2.0

# View logs
kubectl logs -f deployment/photomaton
```

---

## Monitoring & Observability

### Health Checks

#### Application Health Endpoints
```bash
# Basic health check
curl https://your-domain.com/api/healthz

# Detailed readiness check
curl https://your-domain.com/api/ready

# Photo statistics
curl https://your-domain.com/api/photos/stats/overview
```

#### Docker Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1
```

### Logging

#### Structured Logging Setup
```json
{
  "timestamp": "2025-01-26T23:05:00.000Z",
  "level": "info",
  "msg": "Photo transformation completed",
  "photoId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "gemini-imagen",
  "processingTime": 3245,
  "preset": "vampire"
}
```

#### Log Aggregation (ELK Stack)
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  filebeat:
    image: elastic/filebeat:8.11.0
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
      - ./logs:/var/log/photomaton
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - logstash

volumes:
  elasticsearch_data:
```

### Metrics Collection

#### Prometheus Integration
```typescript
// app/server/src/middleware/metrics.ts
import promClient from 'prom-client';

// Create metrics
const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const photoTransforms = new promClient.Counter({
  name: 'photo_transforms_total',
  help: 'Total photo transformations',
  labelNames: ['preset', 'provider', 'status']
});

const transformDuration = new promClient.Histogram({
  name: 'photo_transform_duration_seconds',
  help: 'Photo transformation duration',
  labelNames: ['preset', 'provider']
});

// Export metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Photomaton Metrics",
    "panels": [
      {
        "title": "Photo Transformations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(photo_transforms_total[5m])",
            "legendFormat": "{{preset}} - {{provider}}"
          }
        ]
      },
      {
        "title": "Transformation Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, photo_transform_duration_seconds)",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

---

## Backup & Recovery

### Automated Backup System

#### Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/photomaton"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$DATE"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "Starting backup at $(date)"

# Backup database
echo "Backing up database..."
docker exec photomaton-prod sqlite3 /data/photomaton.db ".backup /data/backup.db"
docker cp photomaton-prod:/data/backup.db "$BACKUP_PATH/photomaton.db"

# Backup photos
echo "Backing up photos..."
docker cp photomaton-prod:/data/photos "$BACKUP_PATH/"

# Backup configuration
echo "Backing up configuration..."
cp .env "$BACKUP_PATH/"
cp docker-compose.prod.yml "$BACKUP_PATH/"

# Create archive
echo "Creating archive..."
cd "$BACKUP_DIR"
tar -czf "backup_$DATE.tar.gz" "backup_$DATE"
rm -rf "backup_$DATE"

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

#### Automated Backup Schedule
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/photomaton/scripts/backup.sh >> /var/log/photomaton-backup.log 2>&1

# Weekly full backup to remote storage
0 3 * * 0 /path/to/photomaton/scripts/backup.sh && rsync -av /backups/photomaton/ user@backup-server:/remote/backups/photomaton/
```

### Disaster Recovery

#### Recovery Procedures
```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/photomaton_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "Starting restore from $BACKUP_FILE"

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Stop services
docker compose -f docker-compose.prod.yml down

# Restore database
docker run --rm -v "$(pwd)/data:/data" -v "$RESTORE_DIR:/restore" alpine:latest \
  cp /restore/photomaton.db /data/photomaton.db

# Restore photos
docker run --rm -v "$(pwd)/data:/data" -v "$RESTORE_DIR:/restore" alpine:latest \
  cp -r /restore/photos /data/

# Restore configuration
cp "$RESTORE_DIR/.env" .
cp "$RESTORE_DIR/docker-compose.prod.yml" .

# Start services
docker compose -f docker-compose.prod.yml up -d

echo "Restore completed"
```

#### Database Recovery
```bash
# Repair corrupted database
docker exec photomaton-prod sqlite3 /data/photomaton.db ".recover" > /tmp/recovered.sql
docker exec photomaton-prod sqlite3 /data/photomaton_new.db < /tmp/recovered.sql

# Verify integrity
docker exec photomaton-prod sqlite3 /data/photomaton.db "PRAGMA integrity_check;"
```

---

## Security Hardening

### Container Security

#### Security Best Practices
```dockerfile
# Use non-root user
FROM node:22-alpine AS runner
RUN addgroup -g 1001 -S nodejs
RUN adduser -S photomaton -u 1001
USER photomaton

# Limit file permissions
COPY --chown=photomaton:nodejs . .

# Read-only filesystem
docker run --read-only --tmpfs /tmp photomaton:latest
```

#### Security Scanning
```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)":/app aquasec/trivy image photomaton:latest

# Update dependencies
npm audit fix
docker build --no-cache -t photomaton:latest .
```

### Network Security

#### Firewall Configuration
```bash
# Ubuntu UFW rules
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 8080  # Block direct access to app
sudo ufw enable
```

#### SSL/TLS Configuration
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
```

### Application Security

#### Environment Security
```bash
# Secure environment files
chmod 600 .env
chown root:root .env

# Rotate secrets regularly
openssl rand -base64 32  # New session secret
```

#### Rate Limiting
```typescript
// Enhanced rate limiting
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many uploads, try again later'
});

app.use('/api/capture', uploadLimiter);
```

---

## Performance Optimization

### Database Optimization

#### Index Creation
```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_preset ON photos(preset);
CREATE INDEX IF NOT EXISTS idx_photos_provider ON photos(provider);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_photos_status_created ON photos(status, created_at DESC);
```

#### Database Maintenance
```bash
# Daily maintenance script
#!/bin/bash
docker exec photomaton-prod sqlite3 /data/photomaton.db "VACUUM;"
docker exec photomaton-prod sqlite3 /data/photomaton.db "ANALYZE;"
```

### Caching Strategy

#### Redis Integration
```yaml
# Add Redis to docker-compose.prod.yml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  restart: unless-stopped

volumes:
  redis_data:
```

#### Application Caching
```typescript
// Cache configuration
import Redis from 'ioredis';

const redis = new Redis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: 3
});

// Cache photo metadata
const cacheKey = `photo:${photoId}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const photo = await photoService.get(photoId);
await redis.setex(cacheKey, 3600, JSON.stringify(photo));
```

### CDN Integration

#### CloudFlare Setup
```javascript
// CloudFlare settings for static assets
const cloudflareConfig = {
  // Cache static images for 1 year
  "/api/photos/*/original": { cacheTtl: 31536000 },
  "/api/photos/*/thumbnail": { cacheTtl: 31536000 },
  "/api/photos/*/transformed/*": { cacheTtl: 31536000 },

  // Cache API responses briefly
  "/api/photos": { cacheTtl: 300 },
  "/api/config": { cacheTtl: 600 }
};
```

---

## Maintenance & Updates

### Rolling Updates

#### Zero-Downtime Deployment
```bash
#!/bin/bash
# scripts/rolling-update.sh

NEW_VERSION="$1"
if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi

echo "Starting rolling update to version $NEW_VERSION"

# Build new image
docker build -t photomaton:$NEW_VERSION .

# Update service with rolling update
docker service update --image photomaton:$NEW_VERSION photomaton_app

# Wait for deployment
docker service logs -f photomaton_app
```

#### Health Check During Updates
```bash
# Monitor health during update
while true; do
    if curl -f https://your-domain.com/api/healthz > /dev/null 2>&1; then
        echo "$(date): Service healthy"
    else
        echo "$(date): Service unavailable"
    fi
    sleep 5
done
```

### Database Migrations

#### Migration Strategy
```typescript
// Migration runner
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Backup before migration
    await backupDatabase();

    // Run migrations
    migrate(db, { migrationsFolder: './migrations' });

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    await restoreDatabase();
    throw error;
  }
}
```

### Cleanup & Maintenance

#### Automated Cleanup
```bash
#!/bin/bash
# scripts/cleanup.sh

echo "Starting maintenance cleanup..."

# Clean old photos (older than 90 days)
find /data/photos -name "*.jpg" -mtime +90 -exec rm {} \;

# Clean Docker
docker system prune -f
docker image prune -f

# Clean logs
find /app/logs -name "*.log" -mtime +7 -delete

# Vacuum database
docker exec photomaton-prod sqlite3 /data/photomaton.db "VACUUM;"

echo "Cleanup completed"
```

#### Monitoring Scripts
```bash
#!/bin/bash
# scripts/monitor.sh

# Check disk usage
DISK_USAGE=$(df /data | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is $DISK_USAGE%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f"), $3/$2 * 100.0}')
echo "Memory usage: $MEMORY_USAGE%"

# Check photo count
PHOTO_COUNT=$(docker exec photomaton-prod sqlite3 /data/photomaton.db "SELECT COUNT(*) FROM photos;")
echo "Total photos: $PHOTO_COUNT"
```

This comprehensive deployment guide covers all aspects of production deployment, from basic setup to advanced orchestration and monitoring strategies.