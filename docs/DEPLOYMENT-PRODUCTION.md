# Production Deployment Guide - Ubuntu + Nginx

> **Complete deployment strategy for Photomaton** on Ubuntu server with Nginx reverse proxy
> **Target domain**: photomaton.com | **Traffic**: Low volume | **Requirements**: Public URL access

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Deployment Recommendation](#deployment-recommendation)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Deployment: Docker + Nginx](#step-by-step-deployment-docker--nginx)
6. [Alternative: Native Node.js + PM2](#alternative-native-nodejs--pm2)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Post-Deployment](#post-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Current State
- **Stack**: React 19 SPA + Express 5 API in single Docker container
- **Data**: SQLite database + file-based photo storage (UUID directories)
- **Features**: AI transformations, runtime config, admin panel, photo export
- **Traffic**: Low traffic, no user auth, public access for all
- **Container**: ~1.09GB, runs on port 8080 (HTTP internally)

### Recommended Deployment
**Docker + Nginx reverse proxy** (Method 1)

**Why this approach?**
- ✅ Your app is already Docker-ready and production-tested
- ✅ Development/production parity (consistent behavior)
- ✅ One-command deployment: `docker compose up -d`
- ✅ Easy updates and rollbacks
- ✅ No application code changes needed
- ✅ Nginx handles SSL, caching, compression

**Timeline**: 4-7 hours for complete deployment

---

## Current Architecture Analysis

### Application Structure

```
┌──────────────────────────────────────┐
│    Docker Container (photomaton-app) │
├──────────────────────────────────────┤
│  Express Server (Port 8080)          │
│  ├─ API Endpoints (/api/*)           │
│  ├─ Static React Build (SPA)         │
│  ├─ Preset Images (/preset-images/*) │
│  └─ Health Checks                    │
│                                       │
│  Data Layer (Docker Volumes)         │
│  ├─ /data/photomaton.db (SQLite)     │
│  ├─ /data/photos/ (UUID dirs)        │
│  │   └─ {uuid}/                      │
│  │       ├─ original.jpg             │
│  │       ├─ thumbnail.jpg            │
│  │       └─ styled-{preset}.jpg      │
│  ├─ /data/presets/ (uploaded images) │
│  ├─ /data/config.json (runtime)      │
│  └─ /data/logs/                      │
└──────────────────────────────────────┘
```

### Key Characteristics

**Single Container Design**
- Express serves both API and static React build
- Production mode: `express.static()` for client files
- All non-API routes serve `index.html` (client-side routing)

**Data Persistence**
- Photos: `/data/photos/{uuid}/` with multiple variants
- Soft delete: moves to `.trash/{uuid}-{timestamp}/`
- Database: SQLite with metadata only (paths, status, timestamps)
- Config: JSON file with runtime settings (timings, providers, presets)

**AI Provider System**
- Runtime-switchable: Mock, Gemini Imagen, Replicate, Stability
- Environment variable selection: `IMAGE_PROVIDER`
- API keys in `.env`

**Current Security**
- CORS: `http://localhost:*` (needs production update)
- Rate limiting: 100 req/min
- HTTPS with self-signed certs (needs Let's Encrypt)
- Zod schema validation on all inputs

**Networking**
- Internal: Port 8080 (HTTPS with self-signed cert)
- HTTP redirect: Port 9080 → 8080
- Current external: Port 8443 mapped to 8080

---

## Deployment Recommendation

### Method 1: Docker + Nginx (RECOMMENDED ✅)

#### Why This Is Best For Your Project

**1. Zero Application Changes**
- App already production-ready in Docker
- No code modifications needed
- Only environment variables need updates

**2. Consistency & Reliability**
- Same container runs in development and production
- `docker compose up --build` tested locally
- Eliminates environment differences

**3. Simple Deployment Workflow**
```bash
# Deploy
docker compose up -d

# Update
git pull && docker compose up -d --build

# Rollback
docker compose down && docker compose up -d <previous-image>
```

**4. Nginx Benefits**
- SSL/TLS termination (Let's Encrypt)
- Static file caching and compression
- Rate limiting and DDoS protection
- Request buffering
- Professional-grade reverse proxy

**5. Resource Efficiency (Low Traffic)**
- Single container: ~500MB RAM typical usage
- Nginx: ~10-20MB RAM
- Total: ~520MB RAM (fits easily on $12/month VPS)

**6. Future Scalability**
- Add more containers behind Nginx easily
- Shared storage for multi-instance setup
- Load balancing ready

#### Trade-offs (Manageable)

**Disk Space**
- Docker image: 1.09GB (one-time cost)
- Photo growth: depends on usage
- **Mitigation**: Regular `.trash/` cleanup, monitor disk usage

**Learning Curve**
- Requires Docker knowledge (but you already have it)
- Nginx configuration (provided in this guide)
- **Mitigation**: Complete step-by-step instructions included

### Method 2: Native Node.js + PM2 (Not Recommended for Your Case)

**Why Not?**
- Requires rebuilding entire deployment process
- Needs native dependency compilation (Sharp, SQLite)
- Manual Node.js version management
- Development/production environment divergence
- More complex update procedure
- No clustering benefits for low traffic

**When to Consider:**
- Extreme disk space constraints
- Corporate environment prohibiting Docker
- Existing PM2 infrastructure

**Verdict:** Docker is better aligned with your current setup and requirements.

---

## Prerequisites

### Server Requirements

**Minimum Specifications**
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **CPU**: 2 cores (1 works but 2+ recommended for AI processing)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 20GB minimum, 50GB+ recommended for photos
- **Network**: Public static IP address
- **Access**: SSH with sudo privileges

**Recommended VPS Providers**
| Provider | Plan | Price/Month | Specs |
|----------|------|-------------|-------|
| **Hetzner** (Best Value) | CX21 | €4.51 (~$5) | 2 vCPU, 4GB RAM, 40GB SSD |
| **DigitalOcean** | Basic | $12 | 2 vCPU, 2GB RAM, 50GB SSD |
| **Vultr** | Regular | $12 | 2 vCPU, 2GB RAM, 55GB SSD |
| **Linode** | Shared | $12 | 2 vCPU, 2GB RAM, 50GB SSD |

### Domain Setup (Do This First!)

**1. Purchase Domain**
- Register `photomaton.com` (any registrar: Namecheap, Google Domains, Cloudflare)
- Cost: ~$10-15/year

**2. Configure DNS Records**

Wait until you have your server IP, then add:

```
Type    Name    Value              TTL
A       @       YOUR_SERVER_IP     300
A       www     YOUR_SERVER_IP     300
```

**3. Verify DNS Propagation**
```bash
# Wait 5-30 minutes, then test
nslookup photomaton.com
dig photomaton.com +short
```

### Required Information Checklist

- [ ] Domain name: `photomaton.com`
- [ ] Server IP address
- [ ] SSH username and password/key
- [ ] Gemini API key (for AI transformations)
- [ ] Git repository URL (if deploying from Git)

### Local Preparation

**1. Update CORS Configuration**

Edit `.env` locally:
```bash
# OLD:
CORS_ORIGIN=http://localhost:*

# NEW:
CORS_ORIGIN=https://photomaton.com,https://www.photomaton.com
```

**2. Update docker-compose.yml for Production**

Change port binding to localhost-only:
```yaml
ports:
  - "127.0.0.1:8080:8080"  # Only bind to localhost
```

Remove or comment out the dev profile section.

**3. Commit Changes**
```bash
git add .
git commit -m "Production configuration for photomaton.com deployment"
git push origin main
```

---

## Step-by-Step Deployment: Docker + Nginx

### Phase 1: Server Initial Setup (30 minutes)

#### 1.1 Connect to Server

```bash
ssh root@YOUR_SERVER_IP
# Or: ssh username@YOUR_SERVER_IP
```

#### 1.2 Update System

```bash
# Update package list and upgrade
apt update && apt upgrade -y

# Install essential tools
apt install -y curl git ufw nano wget
```

#### 1.3 Create Application User (Security)

```bash
# Create non-root user
adduser photomaton
# Set password when prompted

# Grant sudo privileges
usermod -aG sudo photomaton

# Switch to new user
su - photomaton
```

#### 1.4 Configure Firewall

```bash
# Allow SSH (IMPORTANT: do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status

# Expected output:
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

### Phase 2: Install Docker (15 minutes)

#### 2.1 Install Docker Engine

```bash
# Add Docker's official GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### 2.2 Configure Docker for Current User

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Test Docker (should work without sudo)
docker run hello-world
```

#### 2.3 Enable Docker on Boot

```bash
sudo systemctl enable docker
sudo systemctl start docker

# Verify status
sudo systemctl status docker
```

#### 2.4 Verify Installation

```bash
docker --version
# Expected: Docker version 24.x.x or higher

docker compose version
# Expected: Docker Compose version v2.x.x or higher
```

### Phase 3: Install Nginx (10 minutes)

#### 3.1 Install Nginx

```bash
sudo apt install -y nginx

# Enable on boot
sudo systemctl enable nginx

# Start Nginx
sudo systemctl start nginx
```

#### 3.2 Verify Nginx Installation

```bash
# Check status
sudo systemctl status nginx
# Should see "active (running)"

# Test from server
curl http://localhost
# Should see Nginx welcome page HTML

# Test from browser
# Visit: http://YOUR_SERVER_IP
# Should see "Welcome to nginx!" page
```

### Phase 4: Deploy Application (45 minutes)

#### 4.1 Create Project Directory

```bash
# Create application directory
sudo mkdir -p /var/photomaton
sudo chown photomaton:photomaton /var/photomaton
cd /var/photomaton
```

#### 4.2 Transfer Application Files

**Option A: Clone from Git** (Recommended)
```bash
cd /var/photomaton
git clone https://github.com/yourusername/photomaton.git .
# Or with SSH: git clone git@github.com:yourusername/photomaton.git .
```

**Option B: Transfer via SCP** (From your local machine)
```bash
# From your LOCAL machine (not server)
cd /path/to/your/photomaton/project
scp -r * photomaton@YOUR_SERVER_IP:/var/photomaton/

# Or use rsync for better performance:
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'data' \
  --exclude '.git' \
  ./ photomaton@YOUR_SERVER_IP:/var/photomaton/
```

#### 4.3 Create Production Environment File

```bash
cd /var/photomaton
nano .env
```

Copy and customize:

```bash
# =============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================

# Server Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database & Storage
DATABASE_URL=file:/data/photomaton.db
UPLOAD_DIR=/data/photos
MAX_FILE_SIZE=10485760

# Security (CRITICAL - UPDATE THESE!)
CORS_ORIGIN=https://photomaton.com,https://www.photomaton.com
SESSION_SECRET=REPLACE_WITH_RANDOM_STRING_HERE
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AI Provider Configuration
IMAGE_PROVIDER=gemini-imagen
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Replicate (Alternative provider)
# REPLICATE_API_TOKEN=your_replicate_token_here

# Optional: Stability AI (Alternative provider)
# STABILITY_API_KEY=your_stability_key_here

# Feature Flags
ENABLE_DEBUG=false
ENABLE_CAROUSEL_AUTO_REFRESH=true
CAROUSEL_REFRESH_INTERVAL_MS=5000

# Optional: Admin Authentication
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH=bcrypt_hash_here
```

**Generate Secure Session Secret:**
```bash
# Generate random secret
openssl rand -base64 32

# Copy output and paste into .env as SESSION_SECRET
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

**Secure the file:**
```bash
chmod 600 .env
```

#### 4.4 Create Data Directories

```bash
mkdir -p data/photos data/logs data/presets
```

#### 4.5 Build and Start Application

```bash
# Build Docker image (takes 5-10 minutes)
docker compose build

# Start container in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Press Ctrl+C to stop following logs (container keeps running)
```

#### 4.6 Verify Application is Running

```bash
# Check container status
docker ps
# Should see photomaton-app running

# Test health endpoint from server
curl http://localhost:8080/healthz
# Expected response: {"status":"healthy", ...}

# Test API
curl http://localhost:8080/api/config
# Should return configuration JSON
```

If you see errors, check logs:
```bash
docker compose logs --tail=100
```

### Phase 5: Configure Nginx Reverse Proxy (30 minutes)

#### 5.1 Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/photomaton
```

Paste the following configuration:

```nginx
# =============================================================================
# Photomaton Nginx Configuration
# =============================================================================

# Upstream definition for Docker container
upstream photomaton_app {
    server 127.0.0.1:8080;
    keepalive 64;
}

# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name photomaton.com www.photomaton.com;

    # Allow Certbot for SSL certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server (Main Configuration)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name photomaton.com www.photomaton.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/photomaton.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photomaton.com/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (match application setting: 10MB)
    client_max_body_size 10M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Logging
    access_log /var/log/nginx/photomaton_access.log;
    error_log /var/log/nginx/photomaton_error.log;

    # API Proxy
    location /api/ {
        proxy_pass http://photomaton_app;
        proxy_http_version 1.1;

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket support (for future features)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Preset Images (with caching)
    location /preset-images/ {
        proxy_pass http://photomaton_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Cache for 7 days
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Static files and React SPA
    location / {
        proxy_pass http://photomaton_app;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://photomaton_app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # No cache for HTML (SPA entry point)
        location ~* \.html$ {
            proxy_pass http://photomaton_app;
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
}
```

Save and exit.

#### 5.2 Enable Site Configuration

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration (will fail for now - SSL certs missing)
sudo nginx -t
# Ignore errors about missing SSL certificates - we'll fix this next
```

### Phase 6: SSL/TLS Configuration with Let's Encrypt (30 minutes)

#### 6.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 6.2 Create Certbot Directory

```bash
sudo mkdir -p /var/www/certbot
sudo chown www-data:www-data /var/www/certbot
```

#### 6.3 Create Temporary Nginx Config (Without SSL)

We need a working HTTP server to get SSL certificates:

```bash
sudo nano /etc/nginx/sites-available/photomaton-temp
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name photomaton.com www.photomaton.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

```bash
# Enable temporary config
sudo ln -s /etc/nginx/sites-available/photomaton-temp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6.4 Obtain SSL Certificates

```bash
# Request certificate for both domain and www subdomain
sudo certbot certonly --nginx -d photomaton.com -d www.photomaton.com

# Follow the prompts:
# 1. Enter email address (for renewal notifications)
# 2. Agree to Terms of Service (Y)
# 3. Share email with EFF? (optional, Y or N)
```

Expected output:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/photomaton.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/photomaton.com/privkey.pem
```

#### 6.5 Switch to Full Configuration with SSL

```bash
# Remove temporary config
sudo rm /etc/nginx/sites-enabled/photomaton-temp

# Enable full config
sudo ln -s /etc/nginx/sites-available/photomaton /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t
# Should see: "test is successful"

# Reload Nginx
sudo systemctl reload nginx
```

#### 6.6 Test SSL Auto-Renewal

```bash
# Dry run test
sudo certbot renew --dry-run

# Should see: "Congratulations, all simulated renewals succeeded"
```

Certificates automatically renew via systemd timer.

#### 6.7 Verify SSL Configuration

```bash
# Check certificate
echo | openssl s_client -servername photomaton.com -connect photomaton.com:443 2>/dev/null | openssl x509 -noout -dates

# Expected output shows:
# notBefore: Current date
# notAfter: Date 90 days in future
```

### Phase 7: Verify Complete Deployment (15 minutes)

#### 7.1 Check All Services

```bash
# Docker container
docker ps
# Should see photomaton-app running, healthy

# Nginx
sudo systemctl status nginx
# Should see "active (running)"

# Application health
curl http://localhost:8080/healthz
# Should return {"status":"healthy"}
```

#### 7.2 Test from Browser

1. **Visit**: `https://photomaton.com`
   - Should load application with valid SSL (no warnings)
   - Green padlock in browser

2. **Test camera access**
   - Grant camera permission
   - Should see camera feed

3. **Capture photo**
   - Select preset (e.g., "Yellow Toon")
   - Click capture button
   - Wait for countdown
   - Photo should process with AI transformation

4. **Check admin panel**
   - Click ⚙️ icon in header
   - Should open admin dashboard
   - Verify all tabs work (Timings, UI, Providers, Presets, Camera)

5. **Test photo gallery**
   - Should see your captured photo
   - Click to open before/after viewer
   - Test export functionality

#### 7.3 Test API Endpoints

```bash
# Health
curl https://photomaton.com/api/healthz

# Config
curl https://photomaton.com/api/config

# Photos (if you captured any)
curl https://photomaton.com/api/photos

# Stats
curl https://photomaton.com/api/photos/stats
```

#### 7.4 Test SSL Grade

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=photomaton.com

Should get A or A+ grade.

---

## Alternative: Native Node.js + PM2

*Only use this if you cannot use Docker for specific reasons.*

### Installation Steps

#### 1. Install Node.js 22

```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v22.x.x
npm --version
```

#### 2. Install Build Dependencies

```bash
# Required for Sharp and SQLite compilation
sudo apt-get install -y build-essential python3 make g++ \
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev \
    libpixman-1-dev pkg-config
```

#### 3. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on boot
sudo pm2 startup systemd -u photomaton --hp /home/photomaton

# Follow the command it prints (run as shown)
```

#### 4. Deploy Application

```bash
cd /var/photomaton

# Install dependencies
npm install --legacy-peer-deps

# Build application
npm run build

# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'photomaton',
    script: './app/server/dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './data/logs/pm2-error.log',
    out_file: './data/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs photomaton
```

#### 5. Configure Nginx

Use the same Nginx configuration from the Docker method.

#### 6. PM2 Commands

```bash
# Restart
pm2 restart photomaton

# Reload (zero downtime)
pm2 reload photomaton

# Stop
pm2 stop photomaton

# View logs
pm2 logs photomaton --lines 100

# Monitor
pm2 monit
```

---

## Post-Deployment

### Update Procedure

**Docker Method:**
```bash
cd /var/photomaton

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Verify
docker compose logs -f
curl https://photomaton.com/api/healthz
```

**Native Method:**
```bash
cd /var/photomaton

# Pull latest code
git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Rebuild
npm run build

# Reload with zero downtime
pm2 reload photomaton

# Verify
pm2 logs photomaton --lines 50
```

### Backup Strategy

#### Automated Daily Backup Script

```bash
sudo nano /usr/local/bin/photomaton-backup.sh
```

```bash
#!/bin/bash
# Photomaton Backup Script

BACKUP_DIR="/var/backups/photomaton"
DATA_DIR="/var/photomaton/data"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "$(date): Starting backup..."

# Backup database
sqlite3 "$DATA_DIR/photomaton.db" ".backup '$BACKUP_DIR/photomaton-$DATE.db'"
gzip "$BACKUP_DIR/photomaton-$DATE.db"

# Backup config
cp "$DATA_DIR/config.json" "$BACKUP_DIR/config-$DATE.json"

# Weekly: backup photos (Sundays)
if [ $(date +%u) -eq 7 ]; then
    tar -czf "$BACKUP_DIR/photos-$DATE.tar.gz" \
        -C "$DATA_DIR" photos/ \
        --exclude='photos/.trash'
fi

# Clean old backups
find "$BACKUP_DIR" -name "photomaton-*.db.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "photos-*.tar.gz" -mtime +60 -delete

echo "$(date): Backup completed"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/photomaton-backup.sh

# Add to crontab
sudo crontab -e
```

```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/photomaton-backup.sh >> /var/log/photomaton-backup.log 2>&1
```

#### Restore from Backup

```bash
# Stop application
docker compose down  # or: pm2 stop photomaton

# Restore database
gunzip < /var/backups/photomaton/photomaton-YYYYMMDD-HHMMSS.db.gz > /var/photomaton/data/photomaton.db

# Restore photos (if needed)
tar -xzf /var/backups/photomaton/photos-YYYYMMDD-HHMMSS.tar.gz -C /var/photomaton/data/

# Start application
docker compose up -d  # or: pm2 start photomaton
```

---

## Monitoring & Maintenance

### Health Monitoring

**Setup Uptime Monitoring** (Free option: Uptime Robot)

1. Sign up: https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: `https://photomaton.com/api/healthz`
   - Interval: 5 minutes
   - Alert: Email/SMS/Webhook

**Simple Cron Health Check:**

```bash
nano /home/photomaton/healthcheck.sh
```

```bash
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://photomaton.com/api/healthz)

if [ $RESPONSE -ne 200 ]; then
    echo "$(date): Health check FAILED - HTTP $RESPONSE" >> /var/log/photomaton-health.log
    # Optional: send alert via email/webhook
fi
```

```bash
chmod +x /home/photomaton/healthcheck.sh
crontab -e
```

```cron
# Check health every 5 minutes
*/5 * * * * /home/photomaton/healthcheck.sh
```

### Log Management

**View Logs:**
```bash
# Application logs (Docker)
docker compose logs -f
docker compose logs --tail=100

# Application logs (PM2)
pm2 logs photomaton
pm2 logs photomaton --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/photomaton_access.log
sudo tail -f /var/log/nginx/photomaton_error.log
```

**Log Rotation** (Nginx auto-rotates, for app logs):

```bash
sudo nano /etc/logrotate.d/photomaton
```

```
/var/photomaton/data/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 photomaton photomaton
}
```

### Disk Space Management

**Check Disk Usage:**
```bash
# Overall
df -h

# Photo storage
du -sh /var/photomaton/data/photos/
du -sh /var/photomaton/data/photos/.trash/

# Docker images
docker system df
```

**Cleanup Script:**

```bash
nano /usr/local/bin/photomaton-cleanup.sh
```

```bash
#!/bin/bash
echo "$(date): Starting cleanup..."

# Clean trash (files older than 7 days)
find /var/photomaton/data/photos/.trash -type d -mtime +7 -exec rm -rf {} + 2>/dev/null

# Clean old logs
find /var/photomaton/data/logs -name "*.log" -mtime +14 -delete

# Docker: remove unused images
docker image prune -f

echo "$(date): Cleanup completed"
```

```bash
chmod +x /usr/local/bin/photomaton-cleanup.sh
sudo crontab -e
```

```cron
# Weekly cleanup on Sundays at 3 AM
0 3 * * 0 /usr/local/bin/photomaton-cleanup.sh >> /var/log/photomaton-cleanup.log 2>&1
```

---

## Troubleshooting

### Common Issues

#### 1. Can't Access Application (502 Bad Gateway)

**Diagnose:**
```bash
# Check if container is running
docker ps

# Check container logs
docker compose logs --tail=50

# Check if app responds locally
curl http://localhost:8080/healthz

# Check Nginx config
sudo nginx -t
```

**Fix:**
```bash
# Restart container
docker compose restart

# If that doesn't work:
docker compose down
docker compose up -d --build
```

#### 2. SSL Certificate Issues

**Check Certificate:**
```bash
sudo certbot certificates
```

**Renew Certificate:**
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

#### 3. Out of Disk Space

**Emergency Cleanup:**
```bash
# Clean trash
rm -rf /var/photomaton/data/photos/.trash/*

# Clean Docker
docker system prune -a -f

# Clean logs
find /var/photomaton/data/logs -name "*.log" -delete
```

#### 4. Application Won't Start

**Docker:**
```bash
# Check logs for errors
docker compose logs

# Common fixes:
# - Port already in use: Change port in docker-compose.yml
# - Permission issues: sudo chown -R 1001:1001 /var/photomaton/data
# - Environment issue: Check .env file
```

#### 5. Camera Not Working

**Checklist:**
- [ ] Using HTTPS (not HTTP) - camera requires secure context
- [ ] SSL certificate is valid (no browser warnings)
- [ ] Browser granted camera permission
- [ ] Test on different browser/device

#### 6. AI Transformations Failing

**Check Provider:**
```bash
# Verify API key is set
docker exec photomaton-app printenv | grep GEMINI_API_KEY

# Check health endpoint for provider status
curl https://photomaton.com/api/healthz

# Temporarily switch to mock provider
echo "IMAGE_PROVIDER=mock" >> .env
docker compose restart
```

### Debug Mode

**Enable Detailed Logging:**
```bash
nano .env
```

```bash
LOG_LEVEL=debug
ENABLE_DEBUG=true
```

```bash
docker compose restart
docker compose logs -f | grep -i error
```

### Getting Help

**Create Diagnostic Report:**
```bash
cat > /tmp/photomaton-diagnostic.txt <<EOF
=== System Info ===
$(uname -a)
$(docker --version)
$(nginx -v 2>&1)

=== Docker Status ===
$(docker ps -a | grep photomaton)

=== Recent Logs ===
$(docker compose logs --tail=50)

=== Disk Usage ===
$(df -h | grep -E '(Filesystem|/var/photomaton|/$)')

=== Network ===
$(sudo netstat -tlnp | grep -E '(80|443|8080)')
EOF

cat /tmp/photomaton-diagnostic.txt
```

---

## Cost Optimization

### Monthly Cost Breakdown

**Basic Setup (Low Traffic):**
- VPS: $5-12/month (Hetzner/DigitalOcean)
- Domain: ~$1/month ($12/year)
- SSL: $0 (Let's Encrypt)
- Gemini API: $0-5/month (generous free tier)

**Total**: ~$6-18/month

### Optimization Tips

**1. AI Provider Costs:**
- Use Mock provider for development/testing
- Gemini Imagen has generous free tier
- Monitor usage in Google AI Studio

**2. Bandwidth:**
- Enable Gzip compression (✓ already configured)
- Use Cloudflare free CDN (optional)
- Optimize image sizes (✓ Sharp handles this)

**3. Storage:**
- Regular cleanup of `.trash/` directory
- Archive old photos to object storage (S3/B2)
- Monitor with disk alerts

---

## Security Checklist

Final security verification:

- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] SSH key-only authentication (disable password)
- [ ] Non-root user for application
- [ ] SSL/TLS with Let's Encrypt (A+ rating)
- [ ] Strong session secret in .env
- [ ] CORS restricted to your domain
- [ ] Rate limiting enabled
- [ ] .env file permissions set to 600
- [ ] Regular backups configured
- [ ] Monitoring/alerts set up
- [ ] Automatic security updates enabled

**Enable Automatic Security Updates:**
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Summary

You now have a production-ready deployment with:

✅ Docker container running Photomaton
✅ Nginx reverse proxy with SSL
✅ Let's Encrypt certificates (auto-renewing)
✅ Automatic backups
✅ Health monitoring
✅ Log management
✅ Security hardening

**Next Steps:**
1. Test all features thoroughly
2. Set up monitoring alerts
3. Configure backups to remote storage
4. Add your first real photos!

**Access Points:**
- **App**: https://photomaton.com
- **API**: https://photomaton.com/api/*
- **Health**: https://photomaton.com/api/healthz
- **Admin**: Click ⚙️ in app header

**Support Resources:**
- Docker: https://docs.docker.com
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/
- PM2 (if used): https://pm2.keymetrics.io/docs/

Enjoy your production deployment! 🎉
