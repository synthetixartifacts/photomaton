# Development Guide

> **Photomaton Development Workflow** - Complete guide for contributors and developers

## Quick Start for Developers

### Prerequisites
- Docker Desktop with WSL2 support
- Git for version control
- Modern web browser (Chrome/Firefox recommended)
- Text editor/IDE (VS Code recommended)

### Initial Setup
```bash
# 1. Clone the repository
git clone <repository-url>
cd photomaton

# 2. Copy environment configuration
cp .env.example .env

# 3. Start development environment
docker compose --profile dev up --build

# 4. Access the application
open https://localhost:8443
```

---

## Development Environment

### Docker Development Setup

#### Production Mode (Default)
```bash
# Build and run production container
docker compose up --build

# This serves:
# - Built React app at https://localhost:8443
# - API at https://localhost:8443/api
# - HTTPS at https://localhost:8443 (if certificates exist)
```

#### Development Mode (Hot Reload)
```bash
# Start with development profile
docker compose --profile dev up --build

# This provides:
# - Live reload for server changes
# - Vite dev server on port 3000
# - API server on port 8080
# - Database migrations on startup
```

#### Container Architecture
```
Development Container:
├── /app/app/client     # React frontend (mounted from host)
├── /app/app/server     # Express backend (mounted from host)
├── /app/app/shared     # Shared types (mounted from host)
├── /data               # Persistent data volume
├── /certs              # SSL certificates (optional)
└── /app/node_modules   # Container node_modules
```

### Local Development (Alternative)

If you prefer local development without Docker:

```bash
# 1. Install Node.js 22 LTS
nvm install 22
nvm use 22

# 2. Install dependencies
npm install

# 3. Build shared types
npm run build:shared

# 4. Start development servers
npm run dev:server    # Terminal 1: API server
npm run dev:client    # Terminal 2: React dev server
```

---

## Project Structure

### Workspace Organization
```
photomaton/
├── app/
│   ├── client/          # React 19 frontend
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── stores/        # Zustand state stores
│   │   │   ├── contexts/      # React contexts
│   │   │   ├── services/      # API client services
│   │   │   └── config/        # Client configuration
│   │   ├── dist/        # Built frontend assets
│   │   └── package.json # Client dependencies
│   │
│   ├── server/          # Express 5 backend
│   │   ├── src/
│   │   │   ├── api/           # REST API routes
│   │   │   ├── services/      # Business logic services
│   │   │   ├── providers/     # AI provider integrations
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── db/            # Database schema & migrations
│   │   │   └── config/        # Server configuration
│   │   ├── dist/        # Compiled TypeScript
│   │   └── package.json # Server dependencies
│   │
│   └── shared/          # Shared TypeScript types
│       ├── src/
│       │   ├── types.ts       # Core type definitions
│       │   ├── schemas.ts     # Zod validation schemas
│       │   └── config-schema.ts # Configuration types
│       └── dist/        # Compiled shared types
│
├── docs/                # Documentation
├── data/                # Persistent data (photos, database)
├── certs/               # SSL certificates
├── docker-compose.yml   # Container orchestration
├── Dockerfile           # Container definition
└── package.json         # Root workspace configuration
```

### Code Organization Patterns

#### Frontend (React)
```
src/
├── components/          # Reusable UI components
│   ├── AppLayout.tsx   # Main app layout
│   ├── CameraFeed.tsx  # Camera interface
│   ├── PhotoCarousel.tsx # Gallery component
│   └── AdminPanel.tsx  # Configuration panel
│
├── hooks/              # Custom React hooks
│   ├── useCaptureWorkflow.ts # Capture state logic
│   ├── usePhotoGallery.ts    # Gallery management
│   └── useCamera.ts    # Camera access logic
│
├── stores/             # Zustand state management
│   ├── captureStore.ts # Capture workflow state
│   ├── photoStore.ts   # Photo gallery state
│   └── configStore.ts  # Configuration state
│
├── contexts/           # React context providers
│   └── ConfigContext.tsx # App configuration
│
├── services/           # API client services
│   ├── ApiClient.ts    # HTTP client wrapper
│   ├── PhotoService.ts # Photo API methods
│   └── ConfigService.ts # Config API methods
│
└── App.tsx             # Root component
```

#### Backend (Express)
```
src/
├── api/                # REST API endpoints
│   ├── index.ts        # API router
│   ├── photos.ts       # Photo management
│   ├── capture.ts      # Photo capture
│   ├── transform.ts    # Image transformation
│   └── config.ts       # Configuration API
│
├── services/           # Business logic
│   ├── photo.ts        # Photo data service
│   ├── storage.ts      # File storage service
│   └── transform.ts    # Transformation orchestration
│
├── providers/          # AI provider integrations
│   ├── manager.ts      # Provider management
│   ├── types.ts        # Provider interfaces
│   ├── mock/           # Mock provider
│   ├── gemini-imagen/  # Google Gemini
│   ├── replicate/      # Replicate.com
│   └── stability/      # Stability AI
│
├── middleware/         # Express middleware
│   ├── error.ts        # Error handling
│   ├── validation.ts   # Request validation
│   └── upload.ts       # File upload handling
│
├── db/                 # Database layer
│   ├── index.ts        # Database connection
│   ├── schema.ts       # Drizzle schema
│   └── migrations/     # Database migrations
│
├── config/             # Configuration
│   └── index.ts        # Environment config
│
└── index.ts            # Server entry point
```

---

## Development Workflow

### Daily Development Cycle

1. **Start Environment**
   ```bash
   docker compose --profile dev up --build
   ```

2. **Make Changes**
   - Edit files in `app/client/src/` or `app/server/src/`
   - Changes automatically reload in development mode

3. **Test Changes**
   ```bash
   # Run type checking
   docker exec photomaton-dev npm run typecheck

   # Run tests
   docker exec photomaton-dev npm test

   # Run linting
   docker exec photomaton-dev npm run lint
   ```

4. **Verify in Browser**
   - Open https://localhost:8443
   - Test photo capture and transformation workflow

### Git Workflow

#### Branch Strategy
```bash
# Create feature branch
git checkout -b feat/new-provider

# Make changes and commit
git add .
git commit -m "Add new AI provider integration"

# Push and create PR
git push origin feat/new-provider
```

#### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Examples:
```
feat(providers): add Stability AI provider integration
fix(camera): resolve webcam permission handling on Safari
docs(api): update photo endpoints documentation
refactor(state): migrate to Zustand from useState
test(upload): add file validation test cases
```

### Code Quality Standards

#### TypeScript Standards
```typescript
// ✅ Good: Explicit types and interfaces
interface PhotoCaptureOptions {
  preset: PresetType;
  quality: number;
  timeout?: number;
}

async function capturePhoto(options: PhotoCaptureOptions): Promise<Photo> {
  // Implementation
}

// ❌ Bad: Any types and unclear contracts
function capturePhoto(options: any): any {
  // Implementation
}
```

#### React Component Standards
```typescript
// ✅ Good: Typed props and proper error handling
interface CameraFeedProps {
  onCapture: (blob: Blob) => Promise<void>;
  frozen?: boolean;
  className?: string;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  onCapture,
  frozen = false,
  className
}) => {
  // Implementation with error boundaries
};

// ❌ Bad: Untyped props and no error handling
export const CameraFeed = (props) => {
  // Implementation
};
```

#### API Standards
```typescript
// ✅ Good: Validated inputs and structured responses
router.post('/capture',
  validateBody(CaptureSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await photoService.capture(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ❌ Bad: No validation or error handling
router.post('/capture', (req, res) => {
  const result = photoService.capture(req.body);
  res.json(result);
});
```

---

## Testing Strategy

### Test Structure
```
app/
├── client/
│   └── src/
│       ├── __tests__/          # Component tests
│       ├── components/__tests__/ # Component-specific tests
│       └── hooks/__tests__/    # Hook tests
│
└── server/
    └── src/
        ├── __tests__/          # Integration tests
        ├── api/__tests__/      # API endpoint tests
        ├── services/__tests__/ # Service layer tests
        └── providers/__tests__/ # Provider tests
```

### Running Tests

#### All Tests
```bash
# In development container
docker exec photomaton-dev npm test

# With coverage
docker exec photomaton-dev npm run test:coverage

# Watch mode for development
docker exec photomaton-dev npm run test:watch
```

#### Specific Test Categories
```bash
# Frontend tests only
docker exec photomaton-dev npm run test:client

# Backend tests only
docker exec photomaton-dev npm run test:server

# E2E tests
docker exec photomaton-dev npm run test:e2e
```

### Writing Tests

#### Component Testing (React Testing Library)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CaptureButton } from '../CaptureButton';

describe('CaptureButton', () => {
  it('should call onCapture when clicked', async () => {
    const onCapture = jest.fn();
    render(<CaptureButton onCapture={onCapture} disabled={false} />);

    const button = screen.getByRole('button', { name: /capture/i });
    fireEvent.click(button);

    expect(onCapture).toHaveBeenCalledTimes(1);
  });
});
```

#### API Testing (Supertest)
```typescript
import request from 'supertest';
import { app } from '../index';

describe('GET /api/photos', () => {
  it('should return photo list', async () => {
    const response = await request(app)
      .get('/api/photos')
      .expect(200);

    expect(response.body).toHaveProperty('photos');
    expect(Array.isArray(response.body.photos)).toBe(true);
  });
});
```

#### Service Testing (Jest)
```typescript
import { photoService } from '../services/photo';

describe('PhotoService', () => {
  it('should create photo with valid data', async () => {
    const photoData = {
      preset: 'toon-yellow',
      originalPath: '/test/path.jpg'
    };

    const photo = await photoService.create(photoData);

    expect(photo).toHaveProperty('id');
    expect(photo.preset).toBe('toon-yellow');
  });
});
```

---

## Debugging & Development Tools

### Docker Debugging

#### Container Access
```bash
# Access running container shell
docker exec -it photomaton-dev sh

# View container logs
docker compose logs -f dev

# Inspect container details
docker inspect photomaton-dev

# Monitor resource usage
docker stats photomaton-dev
```

#### Database Debugging
```bash
# Access SQLite database
docker exec -it photomaton-dev sqlite3 /data/photomaton.db

# Common queries
.tables                              # List tables
.schema photos                       # Table schema
SELECT * FROM photos LIMIT 5;       # Recent photos
SELECT COUNT(*) FROM photos;        # Total count
```

#### File System Debugging
```bash
# View uploaded photos
docker exec photomaton-dev ls -la /data/photos/

# Check disk usage
docker exec photomaton-dev df -h /data

# View log files
docker exec photomaton-dev tail -f /app/logs/app.log
```

### Frontend Debugging

#### Browser DevTools
- **React DevTools**: Component state inspection
- **Network Tab**: API request monitoring
- **Console**: Error tracking and logging
- **Application Tab**: Local storage and service workers

#### Debug Configuration
```typescript
// Enable debug mode in development
const config = {
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableMetrics: true,
  logLevel: 'debug'
};
```

### Backend Debugging

#### Logging
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty'
  } : undefined
});

// Usage
logger.info({ photoId }, 'Processing photo transformation');
logger.error({ error }, 'Failed to transform photo');
```

#### API Testing
```bash
# Health check
curl -k https://localhost:8443/api/healthz

# List photos
curl -k https://localhost:8443/api/photos

# Upload test photo
curl -X POST \
  -F "photo=@test.jpg" \
  -F "preset=toon-yellow" \
  https://localhost:8443/api/capture
```

---

## Performance Optimization

### Frontend Performance

#### Bundle Analysis
```bash
# Analyze bundle size
docker exec photomaton-dev npm run build:analyze

# Check for unused dependencies
docker exec photomaton-dev npm run deps:check
```

#### React Performance
```typescript
// Use React.memo for expensive components
export const PhotoCarousel = React.memo(({ photos }) => {
  // Component implementation
});

// Use useCallback for stable function references
const handlePhotoClick = useCallback((photoId: string) => {
  setSelectedPhoto(photoId);
}, [setSelectedPhoto]);

// Use useMemo for expensive calculations
const filteredPhotos = useMemo(() => {
  return photos.filter(photo => photo.status === 'completed');
}, [photos]);
```

### Backend Performance

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_photos_created_at ON photos(created_at);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_preset ON photos(preset);
```

#### Caching Strategy
```typescript
// HTTP caching for images
app.get('/api/photos/:id/original', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('ETag', photo.id);
  // Serve image
});

// Memory caching for configuration
const configCache = new Map();
```

### Container Optimization

#### Image Size Reduction
```dockerfile
# Multi-stage build for smaller images
FROM node:22-alpine AS builder
# Build stage

FROM node:22-alpine AS runner
# Runtime stage with minimal dependencies
```

#### Resource Limits
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

---

## Adding New Features

### Adding a New AI Provider

1. **Create Provider Directory**
   ```bash
   mkdir app/server/src/providers/new-provider
   ```

2. **Implement Provider Interface**
   ```typescript
   // app/server/src/providers/new-provider/index.ts
   import { ImageProvider, TransformInput, TransformResult } from '../types';

   export class NewProvider implements ImageProvider {
     name = 'new-provider';

     async isAvailable(): Promise<boolean> {
       return process.env.NEW_PROVIDER_API_KEY !== undefined;
     }

     async validateConfig(): Promise<ValidationResult> {
       // Validate configuration
     }

     async transform(input: TransformInput): Promise<TransformResult> {
       // Implement transformation
     }

     getCapabilities(): ProviderCapabilities {
       // Return provider capabilities
     }
   }
   ```

3. **Register Provider**
   ```typescript
   // app/server/src/providers/manager.ts
   import { NewProvider } from './new-provider';

   constructor() {
     this.registerProvider(new NewProvider());
   }
   ```

4. **Add Environment Variables**
   ```bash
   # .env.example
   NEW_PROVIDER_API_KEY=your_api_key_here
   ```

5. **Update Configuration Schema**
   ```typescript
   // app/shared/src/config-schema.ts
   availableProviders: z.array(z.string()).default([
     'mock', 'gemini-imagen', 'new-provider'
   ])
   ```

6. **Add Tests**
   ```typescript
   // app/server/src/providers/new-provider/__tests__/index.test.ts
   describe('NewProvider', () => {
     // Provider tests
   });
   ```

### Adding a New UI Component

1. **Create Component File**
   ```typescript
   // app/client/src/components/NewComponent.tsx
   interface NewComponentProps {
     data: DataType;
     onAction: (id: string) => void;
   }

   export const NewComponent: React.FC<NewComponentProps> = ({
     data,
     onAction
   }) => {
     return (
       <div className="new-component">
         {/* Component JSX */}
       </div>
     );
   };
   ```

2. **Add Component Tests**
   ```typescript
   // app/client/src/components/__tests__/NewComponent.test.tsx
   import { render, screen } from '@testing-library/react';
   import { NewComponent } from '../NewComponent';

   describe('NewComponent', () => {
     // Component tests
   });
   ```

3. **Update Parent Components**
   ```typescript
   // Import and use in parent component
   import { NewComponent } from './components/NewComponent';
   ```

4. **Add to Storybook** (if configured)
   ```typescript
   // app/client/src/components/NewComponent.stories.tsx
   export default {
     title: 'Components/NewComponent',
     component: NewComponent
   };
   ```

### Adding API Endpoints

1. **Create Route Handler**
   ```typescript
   // app/server/src/api/new-endpoint.ts
   import { Router } from 'express';
   import { validateBody } from '../middleware/validation';

   const router = Router();

   router.post('/',
     validateBody(NewEndpointSchema),
     async (req, res, next) => {
       try {
         // Implementation
         res.json({ success: true, data: result });
       } catch (error) {
         next(error);
       }
     }
   );

   export { router as newEndpointRouter };
   ```

2. **Add to API Router**
   ```typescript
   // app/server/src/api/index.ts
   import { newEndpointRouter } from './new-endpoint';

   router.use('/new-endpoint', newEndpointRouter);
   ```

3. **Add Validation Schema**
   ```typescript
   // app/shared/src/schemas/api.ts
   export const NewEndpointSchema = z.object({
     field: z.string().min(1)
   });
   ```

4. **Add Client Service**
   ```typescript
   // app/client/src/services/NewService.ts
   export class NewService {
     async callNewEndpoint(data: NewEndpointData) {
       return apiClient.post('/new-endpoint', data);
     }
   }
   ```

---

This development guide provides everything needed to contribute effectively to the Photomaton project, from initial setup to advanced feature development.