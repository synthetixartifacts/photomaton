# API Documentation

> **Photomaton REST API** - Complete reference for all endpoints

## Base URL

```
Production:  https://localhost:8443/api
Development: https://localhost:8443/api
```

## Authentication

**Authentication Method**: Microsoft OAuth2 with Azure AD (session-based)
**Session Cookie**: `photomaton.sid` (httpOnly, secure, sameSite=lax)
**Required For**: All `/api/*` endpoints (except health checks)
**Admin Access**: Admin role required for `/admin/*` endpoints

### Session Management

- Sessions stored server-side (SQLite)
- 24-hour session lifetime with rolling expiration
- Session regenerated after successful authentication
- Logout destroys session immediately

### Protected Routes

| Route Pattern | Auth Required | Role Required |
|---------------|---------------|---------------|
| `/auth/*` | No | - |
| `/api/healthz` | No | - |
| `/api/ready` | No | - |
| `/api/photos/*` | ✅ Yes | User or Admin |
| `/api/capture` | ✅ Yes | User or Admin |
| `/api/photos/export/*` | ✅ Yes | User or Admin |
| `/admin/config/*` | ✅ Yes | Admin |
| `/admin/accounts/*` | ✅ Yes | Admin |

## Response Format

All API responses follow this structure:

```typescript
// Success Response
{
  "success": true,
  "data": <response_data>
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": <optional_details>,
    "retry": boolean // Whether retry is recommended
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `ACCOUNT_NOT_FOUND` | Account not found in session | 401 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `PHOTO_NOT_FOUND` | Photo ID not found | 404 |
| `IMAGE_NOT_FOUND` | Image file not found | 404 |
| `TRANSFORM_NOT_READY` | Transformation still processing | 404 |
| `PROVIDER_ERROR` | AI provider error | 500 |
| `PROVIDER_UNAVAILABLE` | Provider temporarily unavailable | 503 |
| `UPLOAD_ERROR` | File upload failed | 400 |
| `STORAGE_ERROR` | File system error | 500 |
| `CONFIG_ERROR` | Configuration error | 400 |

---

## Health & Status Endpoints

### GET /healthz
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T23:05:00.000Z",
  "provider": "mock",
  "version": "0.1.0"
}
```

### GET /ready
Readiness check with detailed system status.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-26T23:05:00.000Z",
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "provider": "healthy"
  },
  "provider": {
    "name": "mock",
    "available": true
  }
}
```

---

## Configuration Endpoints

### GET /config
Get current application configuration.

**Response:**
```json
{
  "timings": {
    "countdownSeconds": 5,
    "displayTransformedSeconds": 15,
    "processingCheckIntervalMs": 1000,
    "maxProcessingTimeSeconds": 30,
    "rotationAnimationMs": 600,
    "fadeAnimationMs": 300
  },
  "ui": {
    "countdownBackgroundOpacity": 0.8,
    "spinnerSize": "w-16 h-16",
    "enableCarouselAutoRefresh": true,
    "carouselRefreshIntervalMs": 5000,
    "maxPhotosInCarousel": 50
  },
  "providers": {
    "activeProvider": "mock",
    "availableProviders": ["mock", "gemini-imagen"],
    "mockDelayMs": 2000
  },
  "presets": {
    "availablePresets": [
      {
        "id": "toon-yellow",
        "name": "Yellow Toon",
        "description": "Cartoon style with yellow theme",
        "enabled": true,
        "prompt": "Transform to cartoon style, vibrant yellow color scheme",
        "icon": "🎨"
      }
    ],
    "defaultPreset": "toon-yellow"
  },
  "features": {
    "enableWebSockets": false,
    "enableDebugMode": false,
    "enableMetrics": false,
    "enablePhotoExport": true,
    "enableBulkDelete": false
  }
}
```

### PUT /config
Update application configuration.

**Request Body:**
```json
{
  "timings": {
    "countdownSeconds": 3
  },
  "ui": {
    "countdownBackgroundOpacity": 0.9
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated configuration object
  }
}
```

### POST /config/reset
Reset configuration to defaults.

**Response:**
```json
{
  "success": true,
  "data": {
    // Default configuration object
  }
}
```

---

## Photo Management Endpoints

### GET /photos
List photos with pagination and filtering.

**Query Parameters:**
- `cursor` (string, optional): Cursor for pagination
- `limit` (number, optional): Number of photos to return (default: 20, max: 100)
- `status` (string, optional): Filter by status (`pending`, `processing`, `completed`, `failed`)
- `preset` (string, optional): Filter by preset (`toon-yellow`, `vampire`, `comic-ink`)

**Example Request:**
```
GET /api/photos?limit=10&status=completed&preset=toon-yellow
```

**Response:**
```json
{
  "photos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2025-01-26T23:05:00.000Z",
      "preset": "toon-yellow",
      "originalPath": "/data/photos/550e8400.../original.jpg",
      "transformedPath": "/data/photos/550e8400.../toon-yellow.jpg",
      "thumbnailPath": "/data/photos/550e8400.../thumbnail.jpg",
      "provider": "mock",
      "processingTime": 2456,
      "status": "completed",
      "metadata": {
        "originalSize": 2048576,
        "transformedSize": 1835264,
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "next_page_cursor",
    "total": 45
  }
}
```

### GET /photos/stats
Get photo statistics.

**Response:**
```json
{
  "total": 45,
  "byStatus": {
    "completed": 42,
    "processing": 1,
    "failed": 2,
    "pending": 0
  },
  "byPreset": {
    "toon-yellow": 20,
    "vampire": 15,
    "comic-ink": 10
  },
  "byProvider": {
    "mock": 30,
    "gemini-imagen": 15
  },
  "averageProcessingTime": 3245,
  "totalStorageUsed": 157286400,
  "oldestPhoto": "2025-01-20T10:30:00.000Z",
  "newestPhoto": "2025-01-26T23:05:00.000Z"
}
```

### GET /photos/stats/overview
Get detailed statistics including storage.

**Response:**
```json
{
  "database": {
    // Same as /photos/stats
  },
  "storage": {
    "totalSize": 157286400,
    "photoCount": 45,
    "averagePhotoSize": 3495253,
    "byType": {
      "original": 94371840,
      "transformed": 52428800,
      "thumbnail": 10485760
    },
    "diskSpace": {
      "available": 5368709120,
      "used": 157286400,
      "total": 21474836480
    }
  }
}
```

### GET /photos/:id
Get detailed information about a specific photo.

**Parameters:**
- `id` (string): Photo UUID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-01-26T23:05:00.000Z",
  "preset": "toon-yellow",
  "originalPath": "/data/photos/550e8400.../original.jpg",
  "transformedPath": "/data/photos/550e8400.../toon-yellow.jpg",
  "thumbnailPath": "/data/photos/550e8400.../thumbnail.jpg",
  "provider": "mock",
  "processingTime": 2456,
  "status": "completed",
  "metadata": {
    "originalSize": 2048576,
    "transformedSize": 1835264,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "captureSettings": {
      "timestamp": "2025-01-26T23:04:57.544Z",
      "userAgent": "Mozilla/5.0...",
      "countdown": 5
    },
    "transformSettings": {
      "provider": "mock",
      "preset": "toon-yellow",
      "strength": 0.8,
      "seed": 12345
    }
  }
}
```

### GET /photos/:id/original
Get the original captured image.

**Parameters:**
- `id` (string): Photo UUID

**Response:** Binary image data (JPEG)
**Headers:**
- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=86400`

### GET /photos/:id/thumbnail
Get the thumbnail image (optimized for gallery display).

**Parameters:**
- `id` (string): Photo UUID

**Response:** Binary image data (JPEG)
**Headers:**
- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=86400`

### GET /photos/:id/transformed/:preset
Get the transformed image for a specific preset.

**Parameters:**
- `id` (string): Photo UUID
- `preset` (string): Preset name (`toon-yellow`, `vampire`, `comic-ink`)

**Response:** Binary image data (JPEG)
**Headers:**
- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=86400`

**Error Cases:**
- `404` if photo not found
- `404` if transformation not ready (still processing)
- `404` if transformed image file missing

### DELETE /photos/:id
Delete a specific photo.

**Parameters:**
- `id` (string): Photo UUID

**Response:** `204 No Content` on success

**Note:** Files are moved to trash directory, not permanently deleted.

### DELETE /photos/all
Delete all photos (admin operation).

**Response:**
```json
{
  "success": true,
  "message": "Deleted 45 photos",
  "count": 45
}
```

---

## Photo Capture & Transform Endpoints

### POST /capture
Upload and save a photo for processing.

**Request:** `multipart/form-data`
- `photo` (file): Image file (JPEG/PNG, max 10MB)
- `preset` (string): Transformation preset

**Example using curl:**
```bash
curl -X POST \
  -F "photo=@image.jpg" \
  -F "preset=toon-yellow" \
  https://localhost:8443/api/capture
```

**Example using JavaScript:**
```javascript
const formData = new FormData();
formData.append('photo', blob, 'photo.jpg');
formData.append('preset', 'toon-yellow');

const response = await fetch('/api/capture', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalPath": "/data/photos/550e8400.../original.jpg",
  "thumbnailPath": "/data/photos/550e8400.../thumbnail.jpg",
  "createdAt": "2025-01-26T23:05:00.000Z",
  "preset": "toon-yellow",
  "status": "pending"
}
```

### POST /transform
Transform a captured photo using AI provider.

**Request Body:**
```json
{
  "photoId": "550e8400-e29b-41d4-a716-446655440000",
  "preset": "toon-yellow",
  "options": {
    "strength": 0.8,
    "seed": 12345
  }
}
```

**Response:**
```json
{
  "photoId": "550e8400-e29b-41d4-a716-446655440000",
  "transformedPath": "/data/photos/550e8400.../toon-yellow.jpg",
  "provider": "mock",
  "processingTime": 2456,
  "status": "completed",
  "metadata": {
    "model": "sharp-posterize",
    "preset": "toon-yellow",
    "strength": 0.8,
    "seed": 12345
  }
}
```

**Async Processing:**
This endpoint may return immediately with `status: "processing"`. Client should poll the photo endpoint to check completion status.

---

## Validation Schemas

### Photo ID Format
```typescript
PhotoIdSchema = z.string().uuid()
// Example: "550e8400-e29b-41d4-a716-446655440000"
```

### Preset Types
```typescript
PresetType = 'toon-yellow' | 'vampire' | 'comic-ink'
```

### Photo Status
```typescript
PhotoStatus = 'pending' | 'processing' | 'completed' | 'failed'
```

### File Upload Constraints
- **Formats**: JPEG, PNG
- **Max Size**: 10MB
- **Min Dimensions**: 100x100px
- **Max Dimensions**: 4096x4096px

---

## Rate Limiting

Default rate limits (configurable via environment):
- **General endpoints**: 100 requests per minute per IP
- **Upload endpoints**: 10 requests per minute per IP
- **Admin endpoints**: 20 requests per minute per IP

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642723200
```

---

## WebSocket API (Future)

When `enableWebSockets` is configured, real-time updates available:

```javascript
const socket = io();

// Listen for transformation completion
socket.on('photo:transformed', (data) => {
  console.log('Photo ready:', data.photoId);
});

// Listen for configuration changes
socket.on('config:updated', (data) => {
  console.log('Config updated:', data);
});
```

---

## Authentication Endpoints

### GET /auth/login
Initiate Microsoft OAuth2 authentication flow.

**Query Parameters:**
- `redirect` (optional): URL to redirect after successful login (default: `/`)

**Response:**
Redirects to Microsoft login page.

**Example:**
```
GET /auth/login?redirect=/photos
```

---

### GET /connect/azure/check
OAuth2 callback endpoint (configured in Azure AD app registration).

**Query Parameters:**
- `code`: Authorization code from Microsoft
- `state`: CSRF protection state token
- `error` (optional): Error code if authentication failed
- `error_description` (optional): Error description

**Response:**
- Success: Redirects to app with session cookie
- Failure: Redirects to `/login?error=<error_code>`

**Error Codes:**
- `auth_failed`: General authentication failure
- `invalid_domain`: Email domain not allowed
- `invalid_state`: CSRF state validation failed
- `missing_code`: Authorization code missing
- `session_error`: Session creation failed

**Note:** This endpoint is called by Microsoft, not directly by client code.

---

### POST /auth/logout
Destroy current session and log out user.

**Request:**
```json
POST /auth/logout
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Session destroyed in database
- Session cookie cleared

---

### GET /auth/me
Get current authenticated user information.

**Request:**
```
GET /auth/me
```

**Response (Authenticated):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@group-era.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2025-01-26T10:30:00.000Z",
  "metadata": {
    "microsoftProfile": {
      "jobTitle": "Software Engineer",
      "department": "Engineering"
    }
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```
HTTP Status: 401

---

### POST /auth/refresh
Refresh access token using refresh token stored in session.

**Request:**
```json
POST /auth/refresh
```

**Response (Success):**
```json
{
  "success": true
}
```

**Response (No Refresh Token):**
```json
{
  "error": "No refresh token available"
}
```
HTTP Status: 401

**Note:** Access token is automatically refreshed server-side. This endpoint is primarily for extending session lifetime.

---

## Admin Account Management Endpoints

### GET /admin/accounts
List all user accounts (Admin only).

**Auth Required:** ✅ Yes (Admin role)

**Response:**
```json
{
  "accounts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@group-era.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2025-01-26T10:30:00.000Z",
      "lastLoginAt": "2025-01-27T14:20:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "admin@group-era.com",
      "name": "Admin User",
      "role": "admin",
      "createdAt": "2025-01-20T08:15:00.000Z",
      "lastLoginAt": "2025-01-27T13:45:00.000Z"
    }
  ]
}
```

---

### GET /admin/accounts/:id
Get specific account details (Admin only).

**Auth Required:** ✅ Yes (Admin role)

**Parameters:**
- `id`: Account UUID

**Response:**
```json
{
  "account": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "microsoftId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "email": "user@group-era.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-01-26T10:30:00.000Z",
    "updatedAt": "2025-01-27T14:20:00.000Z",
    "lastLoginAt": "2025-01-27T14:20:00.000Z",
    "metadata": {
      "microsoftProfile": {
        "jobTitle": "Software Engineer",
        "department": "Engineering"
      }
    }
  }
}
```

---

### PATCH /admin/accounts/:id/role
Update account role (Admin only).

**Auth Required:** ✅ Yes (Admin role)

**Parameters:**
- `id`: Account UUID

**Request:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "account": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@group-era.com",
    "name": "John Doe",
    "role": "admin",
    "updatedAt": "2025-01-27T15:00:00.000Z"
  }
}
```

**Validation:**
- Role must be `"user"` or `"admin"`
- Cannot demote your own admin account
- Returns 403 if trying to modify own role

---

### GET /admin/accounts/stats/overview
Get account statistics overview (Admin only).

**Auth Required:** ✅ Yes (Admin role)

**Response:**
```json
{
  "totalAccounts": 25,
  "accountsByRole": {
    "user": 22,
    "admin": 3
  },
  "recentLogins": 15,
  "newAccountsThisWeek": 3
}
```

---

## Photo Export Endpoints

### GET /api/photos/export/all
Export all user's photos as ZIP archive.

**Auth Required:** ✅ Yes (User or Admin)

**Response:**
Binary ZIP file containing:
- All transformed photos for the authenticated user
- `manifest.json` with photo metadata

**Headers:**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="photomaton-export-{timestamp}.zip"
```

**Example:**
```javascript
const response = await fetch('/api/photos/export/all', {
  credentials: 'include'
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `photos-${Date.now()}.zip`;
a.click();
```

---

### GET /api/photos/export/estimate
Estimate export size and photo count.

**Auth Required:** ✅ Yes (User or Admin)

**Response:**
```json
{
  "photoCount": 42,
  "estimatedSize": 125829120,
  "estimatedSizeMB": 120.0
}
```

---

## Usage Examples

### Complete Photo Capture Flow
```javascript
// 1. Capture photo
const formData = new FormData();
formData.append('photo', photoBlob);
formData.append('preset', 'vampire');

const captureResponse = await fetch('/api/capture', {
  method: 'POST',
  body: formData
});

const { id } = await captureResponse.json();

// 2. Transform photo
const transformResponse = await fetch('/api/transform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    photoId: id,
    preset: 'vampire'
  })
});

// 3. Poll for completion
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/photos/${id}`);
  const photo = await statusResponse.json();

  if (photo.status === 'completed') {
    // Show transformed image
    const imageUrl = `/api/photos/${id}/transformed/vampire`;
    document.getElementById('result').src = imageUrl;
  } else if (photo.status === 'processing') {
    // Continue polling
    setTimeout(checkStatus, 1000);
  }
};

checkStatus();
```

### Configuration Management
```javascript
// Get current config
const config = await fetch('/api/config').then(r => r.json());

// Update countdown time
await fetch('/api/config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timings: {
      countdownSeconds: 3
    }
  })
});

// Reset to defaults
await fetch('/api/config/reset', { method: 'POST' });
```

### Gallery Management
```javascript
// Load photo gallery
const gallery = await fetch('/api/photos?limit=20').then(r => r.json());

// Get photo statistics
const stats = await fetch('/api/photos/stats').then(r => r.json());

// Delete old photos
for (const photo of gallery.photos) {
  if (new Date(photo.createdAt) < oldDate) {
    await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
  }
}
```

---

This API provides complete control over the Photomaton application, from basic health checks to advanced photo processing and configuration management.