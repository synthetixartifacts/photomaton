# Architecture Documentation

> **Photomaton**: Production-ready AI-powered photo booth application

## Overview

Photomaton is a modern web application that captures webcam photos and transforms them using AI providers. Built with a microservice-inspired architecture using a single Docker container for simplicity.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   React 19      │    │      Express 5             │ │
│  │   Frontend      │◄──►│      Backend               │ │
│  │   (SPA)         │    │      (API + Static)        │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│           │                         │                  │
│           │              ┌─────────────────────────────┐ │
│           │              │     Provider System        │ │
│           │              │  ┌─────┐ ┌─────┐ ┌─────┐   │ │
│           │              │  │Mock │ │Gemin│ │Repl.│   │ │
│           │              │  │     │ │i    │ │     │   │ │
│           │              │  └─────┘ └─────┘ └─────┘   │ │
│           │              └─────────────────────────────┘ │
│           │                         │                  │
│           └─────────────────────────┼──────────────────┘
│                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Data Layer                            │ │
│  │  ┌─────────────────┐    ┌─────────────────────────┐ │ │
│  │  │   SQLite DB     │    │    File System         │ │ │
│  │  │  (Metadata)     │    │   (Images/Photos)      │ │ │
│  │  └─────────────────┘    └─────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (React 19)
- **Framework**: React 19 with concurrent features
- **Build Tool**: Vite 7 for fast development and building
- **Styling**: TailwindCSS 4 for utility-first styling
- **Type Safety**: TypeScript 5.9 for full type coverage
- **State Management**: Zustand for reactive state management
- **Camera Access**: getUserMedia API with error handling

### Backend (Express 5)
- **Framework**: Express 5 with native async/await support
- **Database**: SQLite with Drizzle ORM for type-safe queries
- **File Processing**: Sharp for image manipulation and optimization
- **Logging**: Pino for high-performance structured logging
- **Validation**: Zod for runtime schema validation
- **Security**: CORS, rate limiting, secure headers

### Infrastructure
- **Container**: Docker with multi-stage builds
- **Runtime**: Node.js 22 LTS
- **Protocol**: HTTPS with self-signed certificates
- **Storage**: Persistent volumes for data and photos
- **Process Management**: Docker health checks and graceful shutdown

## Core Components

### 1. Frontend Architecture

#### State Management (Zustand)
```typescript
// Capture workflow state
interface CaptureStore {
  state: 'idle' | 'countdown' | 'capturing' | 'processing' | 'displaying' | 'error';
  selectedPreset: PresetType;
  countdownValue: number;
  capturedImageUrl: string | null;
  transformedImageUrl: string | null;
  // ... actions
}

// Photo gallery state
interface PhotoStore {
  photos: Photo[];
  loading: boolean;
  selectedPhoto: Photo | null;
  // ... actions
}

// Configuration state
interface ConfigStore {
  timings: TimingsConfig;
  ui: UIConfig;
  providers: ProviderConfig;
  presets: PresetsConfig;
  // ... actions
}
```

#### Component Hierarchy
```
App
├── AppLayout
│   ├── AppHeader
│   │   └── AdminPanel (modal)
│   ├── CameraFeed
│   │   ├── CountdownOverlay
│   │   └── ProcessingOverlay
│   ├── CaptureControls
│   │   └── PresetSelector
│   ├── PhotoCarousel
│   └── BeforeAfterViewer (modal)
└── ErrorBoundary
```

#### React Hooks System
- **useCaptureWorkflow**: Orchestrates the complete capture workflow
- **usePhotoGallery**: Manages photo selection and viewer state
- **useConfig**: Provides runtime configuration with defaults
- **useCamera**: Handles webcam access and streaming

### 2. Backend Architecture

#### API Layer Structure
```
/api
├── /healthz              # Health check endpoint
├── /ready               # Readiness check endpoint
├── /config              # Configuration management
│   ├── GET /            # Get current config
│   ├── PUT /            # Update config
│   └── POST /reset      # Reset to defaults
├── /photos              # Photo management
│   ├── GET /            # List photos (paginated)
│   ├── GET /stats       # Photo statistics
│   ├── GET /:id         # Get photo metadata
│   ├── GET /:id/original# Get original image
│   ├── GET /:id/thumbnail# Get thumbnail
│   ├── GET /:id/transformed/:preset # Get transformed image
│   ├── DELETE /:id      # Delete single photo
│   └── DELETE /all      # Delete all photos
├── /capture             # Photo capture
│   └── POST /           # Upload and save photo
└── /transform           # Image transformation
    └── POST /           # Transform photo with AI
```

#### Service Layer
```typescript
// Photo management service
class PhotoService {
  async create(data: CreatePhotoData): Promise<Photo>
  async get(id: string): Promise<Photo | null>
  async list(options: ListOptions): Promise<PhotoListResult>
  async update(id: string, data: UpdatePhotoData): Promise<Photo>
  async delete(id: string): Promise<void>
  async getStats(): Promise<PhotoStats>
}

// Storage management service
class StorageService {
  async initialize(): Promise<void>
  async savePhoto(id: string, buffer: Buffer, type: 'original' | 'transformed' | 'thumbnail'): Promise<string>
  async getPhotoPath(id: string, type: string): Promise<string>
  async deletePhoto(id: string): Promise<void>
  async getStorageStats(): Promise<StorageStats>
}

// Transform orchestration service
class TransformService {
  async transform(input: TransformInput): Promise<TransformResult>
  async getTransformStatus(photoId: string): Promise<TransformStatus>
}
```

### 3. Provider System Architecture

#### Provider Interface
```typescript
interface ImageProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  validateConfig(): Promise<ValidationResult>;
  getCapabilities(): ProviderCapabilities;
  transform(input: TransformInput): Promise<TransformResult>;
  estimateCost?(input: TransformInput): number;
}
```

#### Provider Manager
- **Centralized Registration**: All providers registered at startup
- **Dynamic Selection**: Runtime provider switching via environment
- **Fallback Strategy**: Automatic fallback to mock provider on failures
- **Validation**: Config validation before use
- **Error Handling**: Consistent error types and retry logic

#### Available Providers
1. **MockProvider**: Local Sharp-based transformations for development
2. **GeminiImagenProvider**: Google's Imagen AI for production transformations
3. **ReplicateProvider**: Replicate.com API integration
4. **StabilityProvider**: Stability AI integration

### 4. Database Architecture

#### Schema Design (Drizzle ORM)
```sql
-- Photos table
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  preset TEXT NOT NULL,
  original_path TEXT NOT NULL,
  transformed_path TEXT,
  thumbnail_path TEXT,
  provider TEXT,
  processing_time INTEGER,
  metadata TEXT, -- JSON
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Configuration table (future)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### Data Flow
1. **Photo Capture**: Original image saved → database record created
2. **Transformation**: Provider processes → transformed image saved → record updated
3. **Thumbnail Generation**: Automatic thumbnail creation for gallery
4. **Metadata Storage**: Processing time, provider info, and custom data stored as JSON

## Data Flow Patterns

### 1. Photo Capture Workflow
```
User clicks capture
       ↓
Countdown starts (configurable 3-10s)
       ↓
Camera captures frame → Blob
       ↓
POST /api/capture (multipart upload)
       ↓
Server saves original → creates DB record
       ↓
POST /api/transform {photoId, preset}
       ↓
Provider Manager → Selected Provider
       ↓
AI transformation (2-30s)
       ↓
Transformed image saved → DB updated
       ↓
Frontend polls for completion
       ↓
Display result (configurable 5-60s)
       ↓
Return to idle state
```

### 2. Configuration Management
```
Admin opens panel
       ↓
GET /api/config (current settings)
       ↓
User modifies settings
       ↓
PUT /api/config (validate + save)
       ↓
ConfigContext updates
       ↓
Components re-render with new config
```

### 3. Gallery Management
```
Page load / refresh trigger
       ↓
GET /api/photos?cursor&limit
       ↓
PhotoStore updates
       ↓
PhotoCarousel re-renders
       ↓
User clicks photo
       ↓
BeforeAfterViewer opens
       ↓
Loads original + transformed images
```

## Security Architecture

### Authentication System (Microsoft OAuth2)

**Implementation**: `@azure/msal-node` (Microsoft Authentication Library)
**Authentication Flow**: OAuth 2.0 Authorization Code Flow
**Session Storage**: Server-side SQLite sessions (`connect-sqlite3`)

#### Authentication Architecture
```
User Request → Protected Route → requireAuth Middleware
                                      ↓
                         Session Check (req.session.accountId)
                                      ↓
                  ┌─────────────────┴──────────────────┐
                  │                                    │
              Authenticated                    Not Authenticated
                  │                                    │
          Fetch Account from DB              401 Unauthorized Response
                  │                          Redirect to /auth/login
          Verify Role (if needed)                      │
                  │                                    │
          ┌───────┴────────┐                          │
          │                │                          │
    Authorized      Forbidden (403)          Microsoft OAuth Flow
          │                                            │
    Process Request                          Exchange Code for Tokens
                                                       │
                                              Create/Update Account
                                                       │
                                              Store in Session (regenerate)
                                                       │
                                              Redirect to App (authenticated)
```

### Authorization & Access Control (RBAC)

**Roles**: `user` (default), `admin`
**Enforcement**: Middleware-based (`requireAuth`, `requireRole`)
**Storage**: Database (`accounts.role` column)

#### Permission Matrix
| Resource | User | Admin |
|----------|------|-------|
| View own photos | ✅ | ✅ |
| View all photos | ❌ | ✅* |
| Capture photos | ✅ | ✅ |
| Delete own photos | ✅ | ✅ |
| Export own photos | ✅ | ✅ |
| Admin panel access | ❌ | ✅ |
| Modify global config | ❌ | ✅ |
| Manage accounts | ❌ | ✅ |

*Admin sees all photos in stats/overview only; data isolation enforced elsewhere

### Data Isolation & Multi-Tenancy

**Strategy**: Application-level row filtering (SQLite has no native RLS)
**Implementation**: Every query filtered by `accountId` at service level
**Protection Layers**:
1. **Service Layer**: Photo service methods accept `accountId` parameter
2. **Middleware Layer**: `requirePhotoOwnership` verifies ownership
3. **Helper Functions**: `getAccountIdForQuery` returns user ID or undefined (admin)

#### Data Isolation Rules
```typescript
// ✅ CORRECT: User-scoped query
const photos = await photoService.list({}, req.account.id);

// ✅ CORRECT: Ownership verification
const photo = await photoService.get(photoId, req.account.id);
if (!photo) return res.status(404);

// ⚠️ ADMIN ONLY: Global query
const allPhotos = await photoService.list({}); // No accountId filter
```

### Session Security

**Session Configuration**:
- **Storage**: SQLite database (`/data/sessions.db`)
- **Lifetime**: 24 hours with rolling expiration
- **Cookie Name**: `photomaton.sid`
- **Cookie Settings**:
  - `httpOnly: true` - Prevent XSS access
  - `secure: true` - HTTPS only (production)
  - `sameSite: 'lax'` - CSRF protection
  - `signed: true` - Cookie signature verification

**Security Features**:
- Session regeneration after authentication (prevent fixation)
- Immediate session destruction on logout
- Server-side session storage (no client-side data)
- Automatic expired session cleanup

### File Security
- **Upload Validation**: File type, size, and format validation
- **Path Sanitization**: Prevents directory traversal attacks
- **Secure Storage**: Files stored outside web root
- **Automatic Cleanup**: Soft delete to trash directory
- **Account Association**: All photos linked to account (data isolation)

### Network Security
- **HTTPS Enforcement**: TLS required in production
- **Security Headers**: Helmet middleware configured
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HTTPS only)
- **CORS Policy**: Restricted to application domain
- **Input Validation**: Zod schema validation on all inputs
- **Error Handling**: Sanitized error responses (no sensitive data leakage)

### API Security

**Protected Endpoints**:
- All `/api/*` routes require authentication (except health checks)
- Admin routes (`/admin/*`) require admin role
- Photo routes verify ownership before access

**Rate Limiting**:
- 100 requests/minute per IP (configurable)
- Applied to sensitive endpoints (auth, capture, transform)

**Input Validation**:
- Zod schemas on all request bodies
- Email domain validation (configurable allow list)
- File upload size/type restrictions
- SQL injection prevention (parameterized queries via Drizzle ORM)

## Performance Architecture

### Frontend Optimizations
- **Code Splitting**: Automatic route-based splitting with Vite
- **Image Optimization**: Thumbnail generation and lazy loading
- **State Efficiency**: Zustand for minimal re-renders
- **Error Boundaries**: Graceful error recovery

### Backend Optimizations
- **Database Indexing**: Efficient queries with proper indexes
- **Image Processing**: Sharp for high-performance image operations
- **Caching**: HTTP cache headers for static assets
- **Connection Pooling**: SQLite connection management

### Container Optimizations
- **Multi-stage Builds**: Minimal production image size
- **Layer Caching**: Optimized Dockerfile for build speed
- **Health Checks**: Proper container health monitoring
- **Resource Limits**: Memory and CPU constraints

## Deployment Architecture

### Single Container Design
- **Unified Deployment**: Single container for simplicity
- **Static Asset Serving**: Express serves built React app
- **Data Persistence**: Docker volumes for photos and database
- **Process Management**: Graceful shutdown and restart handling

### Environment Configuration
- **12-Factor App**: Configuration via environment variables
- **Secrets Management**: Environment-based API key management
- **Multi-Environment**: Development and production configurations
- **Feature Flags**: Runtime feature toggles via config

### Monitoring & Observability
- **Structured Logging**: Pino with JSON output
- **Health Endpoints**: Multiple health check levels
- **Error Tracking**: Comprehensive error logging and handling
- **Performance Metrics**: Processing time and success rate tracking

## Extension Points

### Adding New Providers
1. Implement `ImageProvider` interface
2. Register in `ProviderManager`
3. Add environment configuration
4. Update documentation

### Adding New Presets
1. Update `config-schema.ts` with new preset
2. Add prompt mapping in provider
3. Update frontend preset selector
4. Test across all providers

### Adding New Features
1. Update shared types in `app/shared/`
2. Add API endpoints in `app/server/src/api/`
3. Create React components in `app/client/src/components/`
4. Update configuration schema if needed

## Future Architecture Considerations

### Scalability
- **Multi-container**: Separate frontend, API, and worker containers
- **Queue System**: Redis/Bull for background processing
- **Load Balancing**: Multiple API instances with shared database
- **CDN Integration**: External image serving and caching

### Advanced Features
- **Real-time Updates**: WebSocket integration for live status
- **Batch Processing**: Multiple photo transformations
- **User Sessions**: Multi-user support with authentication
- **Cloud Storage**: S3-compatible storage integration

This architecture provides a solid foundation for a production-ready photo booth application while maintaining simplicity and extensibility.