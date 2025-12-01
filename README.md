# Photomaton - AI-Powered Photo Booth

> 📷 A browser-based photo booth application that captures webcam images and transforms them using AI providers.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-green?logo=express)](https://expressjs.com)

## ✨ Features

- 📷 **Real-time webcam preview** with configurable countdown
- 🎨 **AI-powered transformations** (cartoon, vampire, comic styles)
- 🖼️ **Photo carousel** with before/after viewer
- ⚙️ **Admin Dashboard** for runtime configuration
- 🔄 **Centralized State Management** with Zustand
- 🔧 **Runtime Configuration** via REST API
- 🐳 **Docker-first deployment** for easy setup
- 🔒 **Privacy-first design** - all data stays local
- 🚀 **Production-Ready** architecture with SOLID principles
- ⚡ **Optimized Performance** with API retry logic

## 🚀 Quick Start

### Prerequisites
- Docker Desktop with WSL2 support
- Modern web browser with webcam access

### Installation & Setup
```bash
# 1. Clone the repository
git clone <repository-url>
cd photomaton

# 2. Configure environment
cp .env.example .env

# 3. Start the application
docker compose up --build

# 4. Open in browser
open https://localhost:8080
```

> **Note**: The application uses HTTPS. Accept the self-signed certificate warning.

### Admin Dashboard

Click the settings icon (⚙️) in the header to access the admin panel where you can:
- Adjust countdown and display timings
- Switch between AI providers
- Enable/disable photo effects
- Configure UI settings
- Monitor system statistics

## 📚 Documentation

### Getting Started
- **[Complete Installation Guide](docs/howto/install.md)** - Full setup instructions
- **[Quick Start Guide](docs/howto/start.md)** - How to run the application

### Architecture & Implementation
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - Complete system architecture
- **[API Documentation](docs/API.md)** - Comprehensive REST API reference
- **[Configuration Reference](docs/CONFIGURATION.md)** - All configuration options
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment strategies

### For Developers
- **[Development Guide](docs/DEVELOPMENT.md)** - Complete development workflow
- **[Gemini Integration](docs/GEMINI_IMPLEMENTATION.md)** - AI provider setup
- **[Recommendations](docs/RECOMMENDATIONS.md)** - Issues analysis and improvements

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI framework with concurrent features
- **Vite 7** - Fast build tool and dev server
- **TailwindCSS 4** - Utility-first CSS framework
- **TypeScript 5.9** - Type-safe JavaScript
- **Zustand** - Lightweight state management

### Backend
- **Express 5** - Web framework with native async/await
- **Drizzle ORM** - Type-safe SQL toolkit
- **SQLite** - Embedded database with migrations
- **Pino** - High-performance structured logging
- **Zod** - Runtime type validation

### Infrastructure
- **Docker** - Single-container deployment
- **Node.js 22 LTS** - JavaScript runtime
- **Sharp** - High-performance image processing
- **HTTPS** - SSL/TLS with self-signed certificates

## 🎨 AI Providers

### Production-Ready Providers
- **Mock Provider** - Offline transformations using Sharp (perfect for demos)
- **Gemini Imagen** - Google's AI image generation (primary production provider)
- **Replicate** - Access to various AI models via Replicate.com
- **Stability AI** - Stability's image generation models

### Available Presets (Runtime Configurable)
- **Toon Yellow** - Cartoon style with vibrant yellow color scheme
- **Vampire** - Gothic vampire portrait with pale skin and dark atmosphere
- **Comic Ink** - Comic book art style with bold ink lines and halftone patterns

> All presets are configurable through the Admin Panel with custom prompts and settings

## 🛠️ Development

### Project Structure
```
photomaton/
├── app/
│   ├── client/          # React frontend
│   ├── server/          # Express backend
│   └── shared/          # Shared TypeScript types
├── docs/                # Documentation
├── tests/               # Test suites
└── docker-compose.yml   # Docker configuration
```

### Development Commands
```bash
# Start development environment
docker compose --profile dev up --build

# Run tests
docker exec photomaton-app npm test

# Type checking
docker exec photomaton-app npm run typecheck

# View logs
docker compose logs -f
```

## 📊 Current Status

✅ **Production-Ready** - Full AI photo booth functionality implemented

### ✅ Completed Core Features
- [x] Complete photo capture workflow (camera → AI transform → gallery)
- [x] Real-time webcam preview with configurable countdown
- [x] AI-powered transformations with multiple providers
- [x] Photo carousel with before/after viewer
- [x] Admin dashboard for runtime configuration
- [x] Centralized state management with Zustand
- [x] Production Docker deployment with HTTPS
- [x] Comprehensive REST API (15+ endpoints)
- [x] SQLite database with Drizzle ORM
- [x] Provider system (Mock, Gemini Imagen, Replicate, Stability)

### ✅ Production Features
- [x] HTTPS with self-signed certificates
- [x] Rate limiting and CORS protection
- [x] Error handling and retry logic
- [x] Health checks and monitoring endpoints
- [x] File upload validation and storage
- [x] Configuration management system
- [x] Graceful shutdown and restart handling

### 🔄 Enhancement Opportunities
- [ ] Comprehensive test coverage (see [RECOMMENDATIONS.md](docs/RECOMMENDATIONS.md))
- [ ] Additional security hardening
- [ ] Performance optimizations
- [ ] Advanced photo editing features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes following the coding standards
4. Test in Docker environment
5. Update documentation as needed
6. Submit a pull request

## 📋 System Requirements

### Minimum
- **RAM**: 8GB
- **Storage**: 2GB free space
- **Docker**: 4.0+ with WSL2
- **Browser**: Chrome 111+, Firefox 128+, Safari 16.4+

### Recommended
- **RAM**: 16GB
- **CPU**: 4+ cores
- **Storage**: 5GB free space
- **Network**: Stable internet for AI providers

## 🔧 Configuration

### Environment Variables
```bash
# Server
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Database
DATABASE_URL=file:/data/photomaton.db

# AI Provider
IMAGE_PROVIDER=mock
GEMINI_API_KEY=your_api_key_here

# Security
CORS_ORIGIN=http://localhost:*
RATE_LIMIT_MAX_REQUESTS=100
```

## 🐛 Troubleshooting

### Common Issues

**Docker build fails**
```bash
docker system prune -a
docker compose build --no-cache
```

**Port 8080 in use**
```bash
PORT=8081 docker compose up --build
```

**Camera not working**
- Allow browser camera permissions
- Use Chrome/Firefox for best compatibility
- Ensure no other tabs are using camera

For more help, see [Troubleshooting Guide](docs/TROUBLESHOOTING.md).

## 📜 License

Private project - All rights reserved

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by classic photo booth experiences
- Powered by AI image transformation

---

**Ready to create amazing AI-powered photos?**

[📖 Read the Installation Guide](docs/howto/install.md) | [🚀 Quick Start](docs/howto/start.md)