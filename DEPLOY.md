# Production Deployment Guide - photomaton.group-era.com

> **Live deployment checklist for Photomaton**
> **Domain**: photomaton.group-era.com | **Server Path**: /datadrive/www/TT_photomaton | **Status**: Ready to deploy

## Table of Contents

1. [Current State Verification](#current-state-verification)
2. [Environment Configuration](#environment-configuration)
3. [Update Application for Production](#update-application-for-production)
4. [Nginx Configuration](#nginx-configuration)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Deploy Application](#deploy-application)
7. [Post-Deployment Testing](#post-deployment-testing)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Current State Verification

### What You Have Already

```
✅ Code on server: /datadrive/www/TT_photomaton
✅ Nginx config: /etc/nginx/sites-available/photomaton.group-era.com.conf
✅ Domain: photomaton.group-era.com (DNS should be configured)
✅ Self-signed certs locally: ./certs/cert.pem, ./certs/key.pem
```

### Current Architecture

```
┌─────────────────────────────────────────┐
│           Internet (Port 443)           │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│          Nginx Reverse Proxy            │
│  - SSL Termination (Let's Encrypt)      │
│  - Static file caching                  │
│  - Gzip compression                     │
└─────────────────┬───────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────┐
│     Docker Container (photomaton-app)   │
│     ┌─────────────────────────────┐     │
│     │ Express Server (Port 8080)  │     │
│     │ - API: /api/*               │     │
│     │ - React SPA (static build)  │     │
│     │ - Health: /healthz          │     │
│     └─────────────────────────────┘     │
│                                          │
│     Volumes:                             │
│     - /data/photomaton.db (SQLite)      │
│     - /data/photos/ (images)            │
│     - /data/logs/ (logs)                │
│     - /data/presets/ (preset images)    │
└──────────────────────────────────────────┘
```

**Key Points:**
- Docker container listens on `127.0.0.1:8080` (HTTPS with self-signed cert internally)
- Nginx terminates SSL and proxies to container
- App is already configured for containerized deployment

---

## Environment Configuration

### Step 1: Create Production .env File

SSH into your server:

```bash
ssh user@your-server-ip
cd /datadrive/www/TT_photomaton
```

Create the production environment file:

```bash
nano .env
```

Copy and customize this configuration:

```bash
# =============================================================================
# PRODUCTION ENVIRONMENT - photomaton.group-era.com
# =============================================================================

# Server Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database & Storage
DATABASE_URL=file:/data/photomaton.db
UPLOAD_DIR=/data/photos
MAX_FILE_SIZE=10485760  # 10MB

# Security (CRITICAL - UPDATE THESE!)
CORS_ORIGIN=https://photomaton.group-era.com
SESSION_SECRET=REPLACE_WITH_RANDOM_STRING_HERE
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AI Provider Configuration
IMAGE_PROVIDER=gemini-imagen
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Alternative providers
# REPLICATE_API_TOKEN=your_token_here
# STABILITY_API_KEY=your_api_key_here

# Feature Flags
ENABLE_DEBUG=false
ENABLE_CAROUSEL_AUTO_REFRESH=true
CAROUSEL_REFRESH_INTERVAL_MS=5000

# Preset Configuration
DEFAULT_PRESET=toon-yellow
```

**Generate secure session secret:**

```bash
openssl rand -base64 32
```

Copy the output and replace `REPLACE_WITH_RANDOM_STRING_HERE` with this value.

**Get your Gemini API key:**
1. Visit: https://aistudio.google.com/app/apikey
2. Create a new API key
3. Replace `your_gemini_api_key_here` with your actual key

**Secure the file:**

```bash
chmod 600 .env
```

### Step 2: Create Data Directories

```bash
cd /datadrive/www/TT_photomaton
mkdir -p data/photos data/logs data/presets
```

---

## Update Application for Production

### Step 3: Update docker-compose.yml

Edit the docker-compose file to bind only to localhost:

```bash
cd /datadrive/www/TT_photomaton
nano docker-compose.yml
```

Change the ports section (line 10) to:

```yaml
    ports:
      - "127.0.0.1:8080:8080"  # Only bind to localhost
```

**IMPORTANT:** Remove or comment out the entire `dev:` service section (lines 36-69) since you won't need it in production:

```yaml
  # Development service (optional - comment out for production)
  # dev:
  #   ... (comment out all dev service lines)
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

### Step 4: Verify Local Certs or Remove Them

The app checks for certificates in `/certs/` inside the container. Since Nginx will handle SSL, we have two options:

**Option A: Keep self-signed certs** (container runs HTTPS internally)
- Your local `./certs/` directory will be mounted
- No changes needed

**Option B: Remove certs** (container runs HTTP internally)
- Nginx still does SSL termination
- You can remove the certs volume mount from docker-compose.yml

**Recommendation:** Keep Option A (current setup) - it works fine.

---

## Nginx Configuration

### Step 5: Update Nginx Configuration

Your current config has the right structure but needs some updates for production.

Edit the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/photomaton.group-era.com.conf
```

Replace the entire contents with this production-ready configuration:

```nginx
# =============================================================================
# Photomaton Production Configuration - photomaton.group-era.com
# =============================================================================

# Upstream definition for Docker container
upstream photomaton_app {
    server 127.0.0.1:8080;
    keepalive 64;
}

# HTTP Server - Redirect to HTTPS (after SSL is set up)
server {
    listen 80;
    listen [::]:80;
    server_name photomaton.group-era.com;

    # Allow Certbot for SSL certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Redirect all other traffic to HTTPS (comment out initially)
    # location / {
    #     return 301 https://$host$request_uri;
    # }

    # Temporary: proxy to app until SSL is configured
    location / {
        proxy_pass http://photomaton_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS Server (uncomment after SSL certificates are obtained)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name photomaton.group-era.com;
#
#     # SSL Configuration (managed by Certbot)
#     ssl_certificate /etc/letsencrypt/live/photomaton.group-era.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/photomaton.group-era.com/privkey.pem;
#
#     # SSL Settings
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
#
#     # Security Headers
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#
#     # Max upload size for photo uploads
#     client_max_body_size 100m;
#
#     # Compression
#     gzip on;
#     gzip_vary on;
#     gzip_min_length 1024;
#     gzip_types text/plain text/css text/xml text/javascript
#                application/json application/javascript application/xml+rss
#                application/rss+xml font/truetype font/opentype
#                application/vnd.ms-fontobject image/svg+xml;
#
#     # Logging
#     access_log /var/log/nginx/photomaton_access.log;
#     error_log /var/log/nginx/photomaton_error.log;
#
#     # API endpoints
#     location /api/ {
#         proxy_pass http://photomaton_app;
#         proxy_http_version 1.1;
#
#         # Proxy headers
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_set_header X-Forwarded-Host $host;
#
#         # WebSocket support
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#
#         # Timeouts for AI processing
#         proxy_connect_timeout 75s;
#         proxy_send_timeout 300s;
#         proxy_read_timeout 300s;
#     }
#
#     # Preset images with caching
#     location /preset-images/ {
#         proxy_pass http://photomaton_app;
#         proxy_http_version 1.1;
#         proxy_set_header Host $host;
#
#         # Cache for 7 days
#         expires 7d;
#         add_header Cache-Control "public, immutable";
#     }
#
#     # Health check endpoint
#     location /healthz {
#         proxy_pass http://photomaton_app;
#         access_log off;
#     }
#
#     # Static files and React SPA
#     location / {
#         proxy_pass http://photomaton_app;
#         proxy_http_version 1.1;
#
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#
#         # Cache static assets aggressively
#         location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
#             proxy_pass http://photomaton_app;
#             expires 1y;
#             add_header Cache-Control "public, immutable";
#         }
#
#         # No cache for HTML (SPA entry point)
#         location ~* \.html$ {
#             proxy_pass http://photomaton_app;
#             expires -1;
#             add_header Cache-Control "no-store, no-cache, must-revalidate";
#         }
#     }
# }
```

**Enable the site:**

```bash
# Test configuration
sudo nginx -t

# If there's a default site, remove it
sudo rm -f /etc/nginx/sites-enabled/default

# Enable your site
sudo ln -sf /etc/nginx/sites-available/photomaton.group-era.com.conf /etc/nginx/sites-enabled/

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Step 6: Install Certbot (if not already installed)

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Step 7: Create Certbot Directory

```bash
sudo mkdir -p /var/www/certbot
sudo chown www-data:www-data /var/www/certbot
```

### Step 8: Verify DNS is Configured

Before obtaining SSL certificates, verify your domain points to the server:

```bash
# Check DNS resolution
nslookup photomaton.group-era.com
dig photomaton.group-era.com +short

# Should return your server's public IP
```

If DNS is not configured:
1. Go to your DNS provider (Cloudflare, etc.)
2. Add an A record: `photomaton.group-era.com` → `YOUR_SERVER_IP`
3. Wait 5-30 minutes for propagation

### Step 9: Obtain SSL Certificates

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d photomaton.group-era.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

**Follow the prompts:**
- Enter your email (for renewal notifications)
- Agree to Terms of Service

**Expected output:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/photomaton.group-era.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/photomaton.group-era.com/privkey.pem
```

### Step 10: Enable HTTPS in Nginx

Edit the Nginx config again:

```bash
sudo nano /etc/nginx/sites-available/photomaton.group-era.com.conf
```

**Make these changes:**

1. **In the HTTP server block**, uncomment the HTTPS redirect:
   ```nginx
   # Uncomment these lines:
   location / {
       return 301 https://$host$request_uri;
   }

   # Comment out the temporary proxy section
   ```

2. **Uncomment the entire HTTPS server block** (remove all `#` at the beginning of lines 40-136)

Save and exit.

**Test and reload:**

```bash
# Test configuration
sudo nginx -t

# Should show: "test is successful"

# Reload Nginx
sudo systemctl reload nginx
```

### Step 11: Test SSL Auto-Renewal

```bash
# Dry run test
sudo certbot renew --dry-run

# Should see: "Congratulations, all simulated renewals succeeded"
```

Certbot automatically sets up a systemd timer for renewal.

---

## Deploy Application

### Step 12: Build and Start Docker Container

```bash
cd /datadrive/www/TT_photomaton

# Pull latest changes (if using Git)
git pull origin main  # or your branch name

# Build Docker image (takes 5-10 minutes first time)
docker compose build

# Start container in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

**Watch for:**
- ✅ "Database migrations completed"
- ✅ "Storage service initialized"
- ✅ "Provider 'gemini-imagen' validated"
- ✅ "HTTPS Server running on port 8080"

Press Ctrl+C to stop following logs (container keeps running).

### Step 13: Verify Container is Running

```bash
# Check container status
docker ps

# Should see:
# CONTAINER ID   IMAGE              STATUS          PORTS
# ...            photomaton-app     Up X minutes    127.0.0.1:8080->8080/tcp

# Test health endpoint from server
curl -k https://localhost:8080/healthz

# Expected response:
# {"status":"healthy","timestamp":"...","provider":"gemini-imagen",...}
```

---

## Post-Deployment Testing

### Step 14: Test Application Access

**From your browser:**

1. Visit: `https://photomaton.group-era.com`
   - Should load application with valid SSL (green padlock)
   - No certificate warnings

2. **Test camera functionality:**
   - Grant camera permission when prompted
   - Should see camera feed

3. **Capture a photo:**
   - Select a preset (e.g., "Yellow Toon")
   - Click capture button
   - Wait for countdown (3-2-1)
   - Photo should process with AI transformation
   - Should see result in gallery

4. **Test admin panel:**
   - Click ⚙️ icon in header
   - Should open admin dashboard
   - Verify all tabs work:
     - Timings
     - UI Settings
     - AI Providers
     - Presets
     - Camera Settings

5. **Test gallery:**
   - Should see captured photos
   - Click to open before/after viewer
   - Test export functionality

### Step 15: Test API Endpoints

```bash
# Health check
curl https://photomaton.group-era.com/api/healthz

# Configuration
curl https://photomaton.group-era.com/api/config

# Photos list
curl https://photomaton.group-era.com/api/photos

# Stats
curl https://photomaton.group-era.com/api/photos/stats
```

### Step 16: Verify SSL Quality

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=photomaton.group-era.com

Should receive an A or A+ rating.

### Step 17: Test from Mobile Device

Access `https://photomaton.group-era.com` from your phone:
- Camera should work
- Touch interactions should be smooth
- Photos should process correctly

---

## Troubleshooting

### Issue 1: Can't Access Site (502 Bad Gateway)

**Diagnose:**

```bash
# Check if container is running
docker ps | grep photomaton

# Check container logs
docker compose logs --tail=50

# Check if app responds locally
curl -k https://localhost:8080/healthz

# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/photomaton_error.log
```

**Fix:**

```bash
# Restart container
docker compose restart

# If that doesn't work, rebuild:
docker compose down
docker compose up -d --build
```

### Issue 2: SSL Certificate Errors

**Check certificate:**

```bash
sudo certbot certificates
```

**Renew manually:**

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Issue 3: Camera Not Working

**Checklist:**
- ✅ Using HTTPS (not HTTP) - camera requires secure context
- ✅ Valid SSL certificate (no browser warnings)
- ✅ Browser granted camera permission
- ✅ Test on different browser/device

**Common fixes:**
- Clear browser cache and reload
- Try incognito/private mode
- Test on Chrome/Firefox/Safari

### Issue 4: AI Transformations Failing

**Check provider status:**

```bash
# Verify API key is set
docker exec photomaton-app printenv | grep GEMINI_API_KEY

# Check provider in health endpoint
curl https://photomaton.group-era.com/api/healthz | jq .provider

# Check logs for errors
docker compose logs | grep -i error
```

**Temporary fix - switch to mock provider:**

```bash
# Edit .env
nano .env
# Change: IMAGE_PROVIDER=mock

# Restart
docker compose restart
```

### Issue 5: Port Already in Use

**Check what's using port 8080:**

```bash
sudo netstat -tlnp | grep 8080
# or
sudo lsof -i :8080
```

**Fix:**
- Kill the conflicting process
- Or change the port in docker-compose.yml

### Issue 6: Permission Errors

**Fix data directory permissions:**

```bash
sudo chown -R 1001:1001 /datadrive/www/TT_photomaton/data
```

### Debug Mode

**Enable detailed logging:**

```bash
cd /datadrive/www/TT_photomaton
nano .env
```

Change:
```bash
LOG_LEVEL=debug
ENABLE_DEBUG=true
```

```bash
docker compose restart
docker compose logs -f
```

---

## Maintenance

### Update Application

```bash
cd /datadrive/www/TT_photomaton

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Verify
docker compose logs -f
curl https://photomaton.group-era.com/api/healthz
```

### View Logs

```bash
# Application logs
docker compose logs -f
docker compose logs --tail=100

# Nginx logs
sudo tail -f /var/log/nginx/photomaton_access.log
sudo tail -f /var/log/nginx/photomaton_error.log
```

### Backup Data

**Manual backup:**

```bash
cd /datadrive/www/TT_photomaton

# Create backup directory
mkdir -p backups

# Backup database
DATE=$(date +%Y%m%d-%H%M%S)
sqlite3 data/photomaton.db ".backup 'backups/photomaton-$DATE.db'"
gzip backups/photomaton-$DATE.db

# Backup config
cp data/config.json backups/config-$DATE.json

# Backup photos (optional - can be large)
tar -czf backups/photos-$DATE.tar.gz data/photos/ --exclude='data/photos/.trash'
```

**Automated backup script** (recommended):

```bash
sudo nano /usr/local/bin/photomaton-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/datadrive/backups/photomaton"
DATA_DIR="/datadrive/www/TT_photomaton/data"
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

# Test it
sudo /usr/local/bin/photomaton-backup.sh

# Add to crontab
sudo crontab -e
```

Add this line:
```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/photomaton-backup.sh >> /var/log/photomaton-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop application
docker compose down

# Restore database
gunzip < backups/photomaton-YYYYMMDD-HHMMSS.db.gz > data/photomaton.db

# Restore photos (if needed)
tar -xzf backups/photos-YYYYMMDD-HHMMSS.tar.gz -C data/

# Start application
docker compose up -d
```

### Cleanup Old Data

```bash
cd /datadrive/www/TT_photomaton

# Clean trash (older than 7 days)
find data/photos/.trash -type d -mtime +7 -exec rm -rf {} + 2>/dev/null

# Clean old logs
find data/logs -name "*.log" -mtime +14 -delete

# Clean Docker images
docker image prune -f
```

### Monitor Disk Space

```bash
# Overall disk usage
df -h

# Photo storage
du -sh /datadrive/www/TT_photomaton/data/photos/
du -sh /datadrive/www/TT_photomaton/data/photos/.trash/

# Docker disk usage
docker system df
```

### Restart Services

```bash
# Restart application only
docker compose restart

# Restart Nginx
sudo systemctl restart nginx

# Restart both
docker compose restart && sudo systemctl restart nginx
```

---

## Quick Reference

### Essential Commands

```bash
# Application
cd /datadrive/www/TT_photomaton
docker compose up -d           # Start
docker compose down            # Stop
docker compose restart         # Restart
docker compose logs -f         # View logs
docker ps                      # Check status

# Nginx
sudo nginx -t                  # Test config
sudo systemctl reload nginx    # Reload
sudo systemctl restart nginx   # Restart
sudo systemctl status nginx    # Status

# SSL
sudo certbot certificates      # Check certs
sudo certbot renew            # Renew certs

# Health checks
curl https://photomaton.group-era.com/api/healthz
curl -k https://localhost:8080/healthz
```

### File Locations

```
/datadrive/www/TT_photomaton/          # Application root
├── .env                                # Environment config
├── docker-compose.yml                  # Docker config
├── data/                               # Persistent data
│   ├── photomaton.db                   # SQLite database
│   ├── photos/                         # Photo storage
│   ├── logs/                           # Application logs
│   └── presets/                        # Preset images
├── certs/                              # Self-signed certs (for container)
└── backups/                            # Local backups

/etc/nginx/sites-available/             # Nginx configs
/etc/letsencrypt/                       # SSL certificates
/var/log/nginx/                         # Nginx logs
```

### Environment Variables Reference

```bash
# Required
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://photomaton.group-era.com
SESSION_SECRET=<random-string>
GEMINI_API_KEY=<your-api-key>

# Optional but recommended
LOG_LEVEL=info
ENABLE_DEBUG=false
IMAGE_PROVIDER=gemini-imagen
```

---

## Post-Deployment Checklist

After following all steps, verify:

- [ ] Application loads at `https://photomaton.group-era.com`
- [ ] SSL certificate is valid (green padlock)
- [ ] Camera access works
- [ ] Photo capture and AI transformation work
- [ ] Admin panel (⚙️) loads and functions
- [ ] Gallery displays photos
- [ ] Export functionality works
- [ ] Health check passes: `/api/healthz`
- [ ] No errors in Docker logs
- [ ] No errors in Nginx logs
- [ ] SSL auto-renewal is configured
- [ ] Backups are configured
- [ ] Firewall allows ports 80, 443

---

## Support & Resources

**Documentation:**
- Architecture: `docs/ARCHITECTURE.md`
- API Reference: `docs/API.md`
- Configuration: `docs/CONFIGURATION.md`
- Development: `docs/DEVELOPMENT.md`

**External Resources:**
- Docker: https://docs.docker.com
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/
- Gemini API: https://ai.google.dev/gemini-api/docs

**Health Monitoring:**
- Set up monitoring: https://uptimerobot.com (free)
- Monitor: `https://photomaton.group-era.com/api/healthz`

---

## Success!

Your Photomaton application should now be live at:

**🎉 https://photomaton.group-era.com 🎉**

Enjoy your production deployment!
