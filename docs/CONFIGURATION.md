# Configuration Reference

> **Photomaton Configuration** - Complete reference for all configuration options

## Overview

Photomaton uses a multi-layered configuration system:
1. **Environment Variables** - Server-level configuration
2. **Runtime Configuration** - User-configurable settings via Admin Panel
3. **Default Values** - Built-in fallbacks with sensible defaults

All configuration is validated using Zod schemas and provides type safety throughout the application.

---

## Environment Variables

### Server Configuration

#### Core Settings
```bash
# Server Environment
NODE_ENV=production                    # production | development
PORT=8080                             # Server port (default: 8080)
LOG_LEVEL=info                        # debug | info | warn | error

# Database
DATABASE_URL=file:/data/photomaton.db # SQLite database path

# File Storage
UPLOAD_DIR=/data/photos               # Photo storage directory
MAX_FILE_SIZE=10485760                # Max upload size in bytes (10MB)
```

#### Security Settings
```bash
# CORS Configuration
CORS_ORIGIN=http://localhost:*        # Allowed origins (comma-separated)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000           # Rate limit window (1 minute)
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window

# Admin Authentication (optional)
ADMIN_USERNAME=admin                  # Admin panel username
ADMIN_PASSWORD_HASH=                  # Bcrypt hash of admin password
SESSION_SECRET=change-this-secret     # Session encryption secret
```

#### Provider Configuration
```bash
# Active Provider
IMAGE_PROVIDER=mock                   # mock | gemini-imagen | replicate | stability

# Mock Provider
MOCK_DELAY_MS=2000                   # Artificial delay for mock provider

# Gemini Imagen Provider
GEMINI_API_KEY=                      # Google AI Studio API key

# Replicate Provider
REPLICATE_API_TOKEN=                 # Replicate.com API token

# Stability AI Provider
STABILITY_API_KEY=                   # Stability AI API key
```

### Environment File Setup

#### .env.example (Template)
```bash
# =============================================================================
# Photomaton Configuration Template
# Copy this file to .env and update the values as needed
# =============================================================================

# Server Configuration
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Database & Storage
DATABASE_URL=file:/data/photomaton.db
UPLOAD_DIR=/data/photos
MAX_FILE_SIZE=10485760

# Security
CORS_ORIGIN=http://localhost:*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Provider Selection
IMAGE_PROVIDER=mock

# Mock Provider (for development/demo)
MOCK_DELAY_MS=2000

# AI Providers (uncomment and configure as needed)
# Gemini Imagen (Primary - get key from https://aistudio.google.com/app/apikey)
# GEMINI_API_KEY=your_gemini_api_key_here

# Replicate (Alternative - get token from https://replicate.com/account/api-tokens)
# REPLICATE_API_TOKEN=your_replicate_token_here

# Stability AI (Alternative - get key from https://platform.stability.ai/account/keys)
# STABILITY_API_KEY=your_stability_key_here

# Admin Panel Authentication (optional)
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH=bcrypt_hash_here
# SESSION_SECRET=your-secure-random-secret-here
```

---

## Runtime Configuration

Runtime configuration is managed through the Admin Panel and stored in the application. These settings can be modified without restarting the server.

### Configuration Schema Structure

```typescript
interface AppConfig {
  timings: TimingsConfig;      // Timing and animation settings
  ui: UIConfig;               // User interface settings
  providers: ProviderConfig;   // Provider selection and options
  presets: PresetsConfig;     // Photo transformation presets
  security: SecurityConfig;   // Security and access settings
  features: FeaturesConfig;   // Feature flags
}
```

### Timings Configuration

Controls various timing aspects of the photo capture workflow.

```typescript
interface TimingsConfig {
  countdownSeconds: number;              // 1-10, default: 5
  displayTransformedSeconds: number;     // 5-60, default: 15
  processingCheckIntervalMs: number;     // 500-5000, default: 1000
  maxProcessingTimeSeconds: number;      // 10-120, default: 30
  rotationAnimationMs: number;           // 100-2000, default: 600
  fadeAnimationMs: number;              // 100-1000, default: 300
}
```

#### Timing Settings Explained

| Setting | Description | Range | Default |
|---------|-------------|-------|---------|
| `countdownSeconds` | Duration of capture countdown | 1-10s | 5s |
| `displayTransformedSeconds` | How long to show result | 5-60s | 15s |
| `processingCheckIntervalMs` | Polling interval for AI status | 0.5-5s | 1s |
| `maxProcessingTimeSeconds` | Timeout for AI processing | 10-120s | 30s |
| `rotationAnimationMs` | Duration of rotation animations | 0.1-2s | 0.6s |
| `fadeAnimationMs` | Duration of fade transitions | 0.1-1s | 0.3s |

#### Usage Examples
```json
{
  "timings": {
    "countdownSeconds": 3,           // Quick 3-second countdown
    "displayTransformedSeconds": 10, // Show result for 10 seconds
    "processingCheckIntervalMs": 500 // Check status every 0.5 seconds
  }
}
```

### UI Configuration

Controls user interface appearance and behavior.

```typescript
interface UIConfig {
  countdownBackgroundOpacity: number;    // 0-1, default: 0.8
  spinnerSize: string;                   // CSS classes, default: "w-16 h-16"
  enableCarouselAutoRefresh: boolean;    // default: true
  carouselRefreshIntervalMs: number;     // 1000-30000, default: 5000
  maxPhotosInCarousel: number;           // 10-100, default: 50
}
```

#### UI Settings Explained

| Setting | Description | Range/Options | Default |
|---------|-------------|---------------|---------|
| `countdownBackgroundOpacity` | Transparency of countdown overlay | 0.0-1.0 | 0.8 |
| `spinnerSize` | Loading spinner size (Tailwind classes) | CSS classes | "w-16 h-16" |
| `enableCarouselAutoRefresh` | Auto-refresh photo gallery | true/false | true |
| `carouselRefreshIntervalMs` | Gallery refresh frequency | 1-30s | 5s |
| `maxPhotosInCarousel` | Maximum photos in gallery | 10-100 | 50 |

#### Usage Examples
```json
{
  "ui": {
    "countdownBackgroundOpacity": 0.9,    // More opaque overlay
    "spinnerSize": "w-24 h-24",           // Larger spinner
    "carouselRefreshIntervalMs": 3000,    // Refresh every 3 seconds
    "maxPhotosInCarousel": 30             // Show only 30 most recent photos
  }
}
```

### Provider Configuration

Controls which AI provider is active and provider-specific settings.

```typescript
interface ProviderConfig {
  activeProvider: string;                // Current provider name
  availableProviders: string[];          // List of available providers
  mockDelayMs: number;                   // 0-10000, default: 2000
}
```

#### Provider Settings

| Setting | Description | Options | Default |
|---------|-------------|---------|---------|
| `activeProvider` | Currently selected AI provider | mock, gemini-imagen, replicate, stability | mock |
| `availableProviders` | List of enabled providers | Array of provider names | ["mock", "gemini-imagen"] |
| `mockDelayMs` | Artificial delay for mock provider | 0-10000ms | 2000ms |

#### Usage Examples
```json
{
  "providers": {
    "activeProvider": "gemini-imagen",
    "availableProviders": ["mock", "gemini-imagen", "replicate"],
    "mockDelayMs": 1000
  }
}
```

### Presets Configuration

Defines available photo transformation presets.

```typescript
interface PresetsConfig {
  availablePresets: PresetDefinition[];
  defaultPreset: string;
}

interface PresetDefinition {
  id: string;           // Unique preset identifier
  name: string;         // Display name
  description: string;  // User-friendly description
  enabled: boolean;     // Whether preset is available
  prompt: string;       // AI transformation prompt
  icon?: string;        // Optional emoji/icon
}
```

#### Default Presets
```json
{
  "presets": {
    "availablePresets": [
      {
        "id": "toon-yellow",
        "name": "Yellow Toon",
        "description": "Cartoon style with yellow theme",
        "enabled": true,
        "prompt": "Transform to cartoon style, vibrant yellow color scheme, flat colors, simple shapes, cheerful mood",
        "icon": "🎨"
      },
      {
        "id": "vampire",
        "name": "Vampire",
        "description": "Gothic vampire portrait",
        "enabled": true,
        "prompt": "Transform to vampire portrait, gothic aesthetic, pale skin, dark atmosphere, mysterious, no gore or blood",
        "icon": "🧛"
      },
      {
        "id": "comic-ink",
        "name": "Comic Ink",
        "description": "Comic book art style",
        "enabled": true,
        "prompt": "Transform to comic book art style, bold ink lines, halftone pattern, dramatic shadows, pop art colors",
        "icon": "💥"
      }
    ],
    "defaultPreset": "toon-yellow"
  }
}
```

#### Custom Preset Example
```json
{
  "id": "cyberpunk",
  "name": "Cyberpunk",
  "description": "Futuristic cyberpunk style",
  "enabled": true,
  "prompt": "Transform to cyberpunk style, neon colors, futuristic technology, urban dystopian aesthetic, digital glitches",
  "icon": "🤖"
}
```

### Security Configuration

Controls authentication and security features.

```typescript
interface SecurityConfig {
  enableAdminAuth: boolean;              // default: false
  adminUsername?: string;                // Admin username
  adminPasswordHash?: string;            // Bcrypt password hash
  sessionSecret: string;                 // Session encryption key
  rateLimitWindowMs: number;             // default: 60000
  rateLimitMaxRequests: number;          // default: 100
}
```

#### Security Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `enableAdminAuth` | Require login for admin panel | false |
| `adminUsername` | Admin panel username | undefined |
| `adminPasswordHash` | Bcrypt hash of admin password | undefined |
| `sessionSecret` | Session encryption secret | "change-this-in-production" |
| `rateLimitWindowMs` | Rate limiting window | 60000ms (1 min) |
| `rateLimitMaxRequests` | Max requests per window | 100 |

#### Security Examples
```json
{
  "security": {
    "enableAdminAuth": true,
    "rateLimitWindowMs": 30000,      // 30-second window
    "rateLimitMaxRequests": 50       // Max 50 requests per 30s
  }
}
```

### Features Configuration

Controls feature flags and experimental functionality.

```typescript
interface FeaturesConfig {
  enableWebSockets: boolean;             // default: false
  enableDebugMode: boolean;              // default: false
  enableMetrics: boolean;                // default: false
  enablePhotoExport: boolean;            // default: true
  enableBulkDelete: boolean;             // default: false
}
```

#### Feature Flags

| Feature | Description | Default | Status |
|---------|-------------|---------|--------|
| `enableWebSockets` | Real-time updates via WebSocket | false | Future |
| `enableDebugMode` | Debug information in UI | false | Available |
| `enableMetrics` | Performance metrics collection | false | Available |
| `enablePhotoExport` | Photo download/export functionality | true | Available |
| `enableBulkDelete` | Bulk photo deletion in admin | false | Available |

---

## Configuration Management

### Admin Panel Configuration

Access the configuration panel:
1. Open the application: https://localhost:8443
2. Click the settings icon (⚙️) in the header
3. Modify settings in the admin panel
4. Changes take effect immediately

### API Configuration Management

#### Get Current Configuration
```bash
curl -k https://localhost:8443/api/config
```

#### Update Configuration
```bash
curl -X PUT https://localhost:8443/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "timings": {
      "countdownSeconds": 3
    },
    "ui": {
      "countdownBackgroundOpacity": 0.9
    }
  }'
```

#### Reset to Defaults
```bash
curl -X POST https://localhost:8443/api/config/reset
```

### Programmatic Configuration

#### React Context Usage
```typescript
import { useConfig, useTimings } from './contexts/ConfigContext';

function MyComponent() {
  const { config, updateConfig } = useConfig();
  const timings = useTimings();

  const handleUpdateCountdown = () => {
    updateConfig({
      timings: {
        ...config.timings,
        countdownSeconds: 3
      }
    });
  };

  return (
    <div>
      <p>Countdown: {timings.countdownSeconds}s</p>
      <button onClick={handleUpdateCountdown}>
        Set 3s Countdown
      </button>
    </div>
  );
}
```

#### Server-side Configuration
```typescript
import { getConfig, updateConfig } from './services/config';

// Get current configuration
const config = await getConfig();

// Update specific settings
await updateConfig({
  providers: {
    activeProvider: 'gemini-imagen'
  }
});
```

---

## Configuration Validation

All configuration is validated using Zod schemas to ensure type safety and valid values.

### Validation Rules

#### Numeric Ranges
```typescript
countdownSeconds: z.number().min(1).max(10)
displayTransformedSeconds: z.number().min(5).max(60)
countdownBackgroundOpacity: z.number().min(0).max(1)
```

#### String Enums
```typescript
activeProvider: z.enum(['mock', 'gemini-imagen', 'replicate', 'stability'])
logLevel: z.enum(['debug', 'info', 'warn', 'error'])
```

#### Array Validation
```typescript
availableProviders: z.array(z.string()).min(1)
availablePresets: z.array(PresetSchema).min(1)
```

### Error Handling

Invalid configuration values are rejected with detailed error messages:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Configuration validation failed",
    "details": {
      "timings.countdownSeconds": "Number must be between 1 and 10",
      "ui.countdownBackgroundOpacity": "Number must be between 0 and 1"
    }
  }
}
```

---

## Configuration Best Practices

### Development Settings
```json
{
  "timings": {
    "countdownSeconds": 3,
    "mockDelayMs": 500
  },
  "features": {
    "enableDebugMode": true,
    "enableMetrics": true
  }
}
```

### Production Settings
```json
{
  "timings": {
    "countdownSeconds": 5,
    "displayTransformedSeconds": 15,
    "maxProcessingTimeSeconds": 60
  },
  "providers": {
    "activeProvider": "gemini-imagen"
  },
  "security": {
    "enableAdminAuth": true,
    "rateLimitMaxRequests": 50
  },
  "features": {
    "enableDebugMode": false,
    "enableMetrics": true
  }
}
```

### Performance Optimization
```json
{
  "ui": {
    "enableCarouselAutoRefresh": false,
    "maxPhotosInCarousel": 20
  },
  "timings": {
    "processingCheckIntervalMs": 2000
  }
}
```

### High-Volume Events
```json
{
  "timings": {
    "countdownSeconds": 3,
    "displayTransformedSeconds": 8
  },
  "ui": {
    "maxPhotosInCarousel": 100,
    "carouselRefreshIntervalMs": 2000
  },
  "security": {
    "rateLimitMaxRequests": 200,
    "rateLimitWindowMs": 60000
  }
}
```

---

## Troubleshooting Configuration

### Common Issues

#### Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la .env

# Verify environment in container
docker exec photomaton-app printenv | grep IMAGE_PROVIDER
```

#### Configuration Not Persisting
```bash
# Check database permissions
docker exec photomaton-app ls -la /data/

# Verify configuration API
curl -k https://localhost:8443/api/config
```

#### Provider Not Available
```bash
# Check API key configuration
docker exec photomaton-app printenv | grep GEMINI_API_KEY

# Test provider directly
curl -k https://localhost:8443/api/healthz
```

### Validation Errors
```typescript
// Check configuration schema
import { AppConfigSchema } from '@photomaton/shared';

try {
  const validConfig = AppConfigSchema.parse(userConfig);
} catch (error) {
  console.error('Validation errors:', error.errors);
}
```

### Debugging Configuration
```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> .env
docker compose restart

# Monitor configuration changes
docker compose logs -f | grep config
```

This configuration system provides extensive customization options while maintaining type safety and validation throughout the application.