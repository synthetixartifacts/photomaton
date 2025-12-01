# Photomaton - Complete Installation Guide

## System Requirements

### Required Software
- **Docker Desktop** 4.0+ with WSL2 support
- **WSL2** (Windows Subsystem for Linux 2)
- **Git** for version control
- **Modern Web Browser** (Chrome/Firefox/Edge recommended)

### Hardware Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB free space for Docker images and data
- **Webcam**: Built-in or USB webcam for photo capture
- **Network**: Internet connection for AI provider setup (optional for mock mode)

---

## Installation Steps

### 1. Install Docker Desktop with WSL2

#### Windows Users:
1. **Enable WSL2**:
   ```powershell
   # Run as Administrator in PowerShell
   wsl --install
   # Restart your computer
   ```

2. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop/
   - During installation, ensure "Use WSL 2 instead of Hyper-V" is checked
   - After installation, verify Docker is using WSL2:
     ```bash
     docker version
     ```

#### macOS Users:
1. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Verify installation:
     ```bash
     docker version
     ```

#### Linux Users:
1. **Install Docker Engine**:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

### 2. Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd photomaton

# Switch to development branch (if applicable)
git checkout 001
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional)
nano .env
```

#### Environment Variables Explained:
```bash
# Server Configuration
NODE_ENV=development          # development/production
PORT=8080                    # Server port
LOG_LEVEL=info              # debug/info/warn/error

# Database
DATABASE_URL=file:/data/photomaton.db  # SQLite database path

# File Storage
UPLOAD_DIR=/data/photos     # Photo storage directory
MAX_FILE_SIZE=10485760      # 10MB file size limit

# Provider Configuration
IMAGE_PROVIDER=mock         # mock/gemini-imagen
MOCK_DELAY_MS=2000         # Mock processing delay

# Optional: Gemini Imagen API (for real AI transformations)
# GEMINI_API_KEY=your_api_key_here

# Security
CORS_ORIGIN=http://localhost:*
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Docker Setup Verification

```bash
# Verify Docker is working
docker --version
docker compose --version

# Test Docker functionality
docker run hello-world
```

---

## Development Environment Setup

### 1. Node.js (Optional - for local development)

If you want to run development commands outside Docker:

```bash
# Install Node.js 22 LTS
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22

# Verify installation
node --version  # Should be v22.x.x
npm --version   # Should be 10.x.x+
```

### 2. Local Dependencies (Optional)

```bash
# Install project dependencies locally
npm install --legacy-peer-deps

# Build shared types
npm run build:shared
```

---

## Gemini Imagen API Setup (Optional)

For real AI transformations instead of mock effects:

### 1. Get API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Create new API key
4. Copy the API key

### 2. Configure Environment
```bash
# Edit .env file
echo "GEMINI_API_KEY=your_actual_api_key_here" >> .env
echo "IMAGE_PROVIDER=gemini-imagen" >> .env
```

### 3. Test API Access
```bash
# Test API connectivity (after starting the application)
curl -X GET "https://localhost:8443/api/healthz"
# Should show provider: "gemini-imagen" if configured correctly
```

---

## Directory Structure

After installation, your project should look like:

```
photomaton/
├── app/
│   ├── client/             # React frontend
│   ├── server/             # Express backend
│   └── shared/             # Shared TypeScript types
├── docs/
│   ├── howto/             # Documentation
│   │   ├── install.md     # This file
│   │   ├── start.md       # Startup guide
│   │   └── RUN_GUIDE.md   # User guide
│   └── adrs/              # Architecture decisions
├── tests/                 # Test files
├── .env                   # Environment variables
├── .env.example           # Environment template
├── docker-compose.yml     # Docker orchestration
├── Dockerfile             # Container definition
└── package.json           # Project configuration
```

---

## Troubleshooting Installation

### Docker Issues

**Problem**: Docker build fails with permission errors
```bash
# Solution: Fix Docker permissions (Linux)
sudo chmod 666 /var/run/docker.sock
# Or add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**Problem**: WSL2 not working on Windows
```bash
# Solution: Update WSL2 kernel
wsl --update
wsl --set-default-version 2
```

### Node.js Issues

**Problem**: NPM install fails with engine warnings
```bash
# Solution: Use legacy peer deps flag
npm install --legacy-peer-deps
```

**Problem**: TypeScript compilation errors
```bash
# Solution: Ensure Node.js 22+ is installed
node --version
# Should be v22.12.0 or higher
```

### Network Issues

**Problem**: Docker can't pull images
```bash
# Solution: Check internet connection and Docker daemon
docker info
systemctl status docker  # Linux
```

**Problem**: Port 8080 already in use
```bash
# Solution: Find and kill process using port
lsof -i :8080
kill -9 <PID>

# Or change port in .env file
echo "PORT=8081" >> .env
```

---

## Verification Steps

After installation, verify everything works:

```bash
# 1. Check Docker
docker --version
docker compose --version

# 2. Check project files
ls -la
cat .env

# 3. Test build (this should work without errors)
docker compose build

# 4. Quick start test
docker compose up --build
# Should see server starting messages
```

---

## Next Steps

After successful installation:

1. **Read the startup guide**: [start.md](./start.md)
2. **Run the application**: Follow quick start instructions
3. **Check the user guide**: [RUN_GUIDE.md](./RUN_GUIDE.md)
4. **Explore the codebase**: Review `app/` directory structure

---

## Getting Help

If you encounter issues:

1. **Check logs**: `docker compose logs`
2. **Verify requirements**: Ensure all prerequisites are installed
3. **Check environment**: Verify `.env` file configuration
4. **Clean restart**: `docker compose down -v && docker compose up --build`
5. **File an issue**: Create issue with error logs and system info

---

## System Information Template

When reporting issues, include:

```bash
# System Information
echo "OS: $(uname -a)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose --version)"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"

# Project Information
echo "Branch: $(git branch --show-current)"
echo "Last Commit: $(git log -1 --oneline)"
```

Installation complete! Proceed to [start.md](./start.md) to run the application.