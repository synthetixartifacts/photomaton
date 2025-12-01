# Security Guidelines

> **Photomaton Security Documentation**
> **Last Updated**: 2025-11-24
> **Security Level**: 🔒 High | **Multi-Tenant**: ✅ Yes

## Overview

This document outlines the security architecture, best practices, and guidelines for the Photomaton application. The system implements enterprise-grade security with Microsoft Azure AD authentication, role-based access control (RBAC), and complete data isolation between accounts.

---

## Authentication

### Microsoft OAuth2 with Azure AD

**Implementation**: `@azure/msal-node` (Microsoft Authentication Library)
**Protocol**: OAuth 2.0 Authorization Code Flow with PKCE
**Identity Provider**: Microsoft Azure AD (Entra ID)

#### Key Features
- ✅ Single Sign-On (SSO) with Microsoft accounts
- ✅ Domain-restricted registration (configurable via `.env`)
- ✅ Secure token management with refresh tokens
- ✅ Session-based authentication with secure cookies
- ✅ CSRF protection with state parameter validation

#### Authentication Flow

```
1. User visits app → AuthProvider checks /auth/me for existing session
2. If not authenticated → Redirect to /auth/login
3. Backend generates OAuth URL with CSRF state → Redirect to Microsoft
4. User authenticates with Microsoft
5. Microsoft redirects to /connect/azure/check with authorization code
6. Backend exchanges code for tokens via MSAL
7. Domain validation ensures email is from allowed domain (@group-era.com)
8. Account created (new user) or updated (existing user)
9. Session regenerated and user data stored
10. User redirected to app with authenticated session
```

#### Security Measures

- **CSRF Protection**: State parameter validated on OAuth callback
- **Session Regeneration**: New session ID issued after successful authentication
- **Domain Restriction**: Only specified email domains allowed (configurable)
- **Token Storage**: Access/refresh tokens stored server-side in encrypted session
- **PII Logging Disabled**: MSAL configured to never log personally identifiable information

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

**Roles**: `user`, `admin`
**Default Role**: `user` (assigned to new accounts)
**Role Storage**: Database (`accounts.role` column)
**Enforcement**: Middleware-based (`requireAuth`, `requireRole`)

#### Role Permissions

| Feature | User | Admin |
|---------|------|-------|
| View own photos | ✅ | ✅ |
| View all photos | ❌ | ✅* |
| Capture photos | ✅ | ✅ |
| Delete own photos | ✅ | ✅ |
| Export own photos | ✅ | ✅ |
| Access admin panel | ❌ | ✅ |
| Modify global config | ❌ | ✅ |
| Manage user accounts | ❌ | ✅ |
| Change user roles | ❌ | ✅ |

*Admin can view all photos in stats/overview endpoints only (data isolation still enforced in most endpoints)

#### Authorization Middleware

```typescript
// Require authentication
app.use('/api/photos', requireAuth);

// Require specific role
app.use('/admin/config', requireRole('admin'));

// Verify resource ownership
app.get('/api/photos/:id', requirePhotoOwnership, handler);
```

---

## Data Isolation & Multi-Tenancy

### Strategy: Application-Level Row Filtering

**Reason**: SQLite does not support Row-Level Security (RLS) natively
**Implementation**: Every query includes `accountId` filter at service level
**Layers**: Dual-layer protection (service + middleware)

#### Data Isolation Rules

1. **All Photos Have AccountId**: Foreign key constraint, NOT NULL
2. **Service-Level Filtering**: Photo service methods accept `accountId` parameter
3. **Middleware Verification**: `requirePhotoOwnership` verifies ownership before access
4. **Query Helpers**: `getAccountIdForQuery` returns user ID or undefined (for admins)
5. **No Orphaned Data**: Migration assigned legacy account to existing photos

#### Data Isolation Validation

```typescript
// ✅ CORRECT: User-specific query
const photos = await photoService.list({}, req.account.id);

// ✅ CORRECT: Ownership verification
const photo = await photoService.get(photoId, req.account.id);
if (!photo) return res.status(404);

// ❌ WRONG: No account filtering
const photos = await photoService.list({}); // Admin-only!
```

#### Critical Security Checkpoints

1. **Photo Creation**: `accountId` automatically assigned from authenticated user
2. **Photo Retrieval**: Always filtered by `accountId` unless admin override
3. **Photo Deletion**: Ownership verified before allowing deletion
4. **Photo Export**: ZIP export filtered by authenticated user's `accountId`
5. **Statistics**: User-specific stats unless admin requests global view

---

## Session Management

### Configuration

**Session Store**: SQLite (`connect-sqlite3`)
**Session Location**: `/data/sessions.db`
**Session Lifetime**: 24 hours (configurable via `SESSION_MAX_AGE`)
**Rolling Sessions**: ✅ Yes (session extended on activity)
**Secure Cookies**: ✅ Yes (production)

#### Cookie Security

```typescript
cookie: {
  httpOnly: true,           // Prevent XSS attacks (no JavaScript access)
  secure: true,             // HTTPS only (production)
  sameSite: 'lax',          // CSRF protection
  maxAge: 86400000,         // 24 hours
  path: '/',
}
```

#### Session Data Structure

```typescript
interface SessionData {
  accountId: string;        // User account ID
  microsoftId: string;      // Azure AD user ID
  email: string;            // User email
  role: UserRole;           // User role (user|admin)
  accessToken?: string;     // Microsoft access token
  refreshToken?: string;    // Microsoft refresh token
  tokenExpiry?: number;     // Token expiration timestamp
}
```

#### Session Security Features

- ✅ **Server-Side Storage**: Sensitive data never sent to client
- ✅ **Persistent Sessions**: Survive server restarts (SQLite storage)
- ✅ **Session Regeneration**: New session ID after authentication
- ✅ **Immediate Revocation**: Logout destroys session instantly
- ✅ **Automatic Cleanup**: Expired sessions cleaned up by store
- ✅ **Cookie Signing**: Session cookie signed with secret key

---

## Input Validation

### Zod Schema Validation

**Library**: `zod` v3.24+
**Coverage**: All API endpoints with request bodies
**Validation Points**: Request body, query parameters, route parameters

#### Validation Examples

```typescript
// Account creation schema
const CreateAccountSchema = z.object({
  microsoftId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

// Photo capture schema
const CapturePhotoSchema = z.object({
  preset: z.enum(['toon-yellow', 'vampire', 'comic-ink']),
  transformOptions: z.object({...}).optional(),
});
```

#### Validation Middleware

```typescript
router.post('/endpoint',
  validateBody(Schema),
  async (req, res, next) => {
    // req.body is now type-safe and validated
  }
);
```

#### Input Validation Checklist

- ✅ Email format validation
- ✅ Domain validation (server-side)
- ✅ Enum validation for roles and presets
- ✅ File upload size limits (via multer)
- ✅ File type validation (image/* only)
- ✅ Path traversal prevention (no user input in file paths)
- ✅ SQL injection prevention (parameterized queries via Drizzle ORM)
- ✅ XSS prevention (no user input rendered as HTML)

---

## Secrets Management

### Environment Variables

**Storage**: `.env` file (not committed to Git)
**Example**: `.env.example` (template, committed)
**Loading**: `dotenv` library

#### Required Secrets

```bash
# Azure AD Configuration
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_TENANT_ID=<tenant-id>

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=<random-secret-key>

# Redirect URI
REDIRECT_URI=https://photomaton.group-era.com/connect/azure/check

# Domain Restriction
DOMAIN_EMAIL=group-era.com
```

#### Secrets Best Practices

- ✅ **Never Commit Secrets**: `.env` in `.gitignore`
- ✅ **Strong Session Secret**: Min 32 bytes, cryptographically random
- ✅ **Environment-Specific**: Different secrets for dev/staging/prod
- ✅ **No Secrets in Logs**: PII logging disabled, secrets filtered
- ✅ **No Secrets in Errors**: Error messages never expose secrets
- ✅ **Rotate Regularly**: Client secrets rotated every 90 days (recommended)

---

## Network Security

### HTTPS Enforcement

**Production**: ✅ HTTPS required
**Development**: HTTP allowed (localhost only)
**Certificate**: SSL/TLS certificate configured in Docker

### Security Headers (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: false,      // Disabled (configure as needed)
  crossOriginEmbedderPolicy: false,  // Disabled for image processing
}));
```

**Headers Set**:
- `X-DNS-Prefetch-Control: off`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 0` (deprecated, CSP preferred)
- `Strict-Transport-Security` (HTTPS only)

### CORS Policy

**Configuration**: Localhost-only in development
**Production**: Restricted to application domain
**Credentials**: ✅ Allowed (required for cookies)

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://photomaton.group-era.com'
    : 'http://localhost:8080',
  credentials: true,
}));
```

---

## Logging & Monitoring

### Structured Logging (Pino)

**Library**: `pino` + `pino-http`
**Format**: JSON (structured)
**Level**: Info (production), Debug (development)
**Destination**: stdout (Docker logs)

#### Security Event Logging

```typescript
// Authentication Events
logger.info({ accountId, email, isNewUser }, 'User authenticated');
logger.warn({ email, domain }, 'Domain validation failed');
logger.error({ error }, 'OAuth callback failed');

// Authorization Events
logger.warn({ accountId, requiredRole, currentRole }, 'Insufficient permissions');
logger.warn({ accountId, resourceId }, 'Ownership verification failed');

// Session Events
logger.info({ accountId }, 'Session created');
logger.info({ accountId }, 'Session destroyed');
```

#### PII Protection

- ✅ **No Passwords Logged**: OAuth flow, no passwords stored
- ✅ **No Tokens Logged**: Access/refresh tokens never logged
- ✅ **Email Redaction**: Consider redacting emails in production logs
- ✅ **User Images**: Never logged or exposed in error messages

### Security Metrics to Monitor

1. **Failed Login Attempts**: Track by email/IP for brute-force detection
2. **Unauthorized Access Attempts**: 401/403 responses
3. **Role Escalation Attempts**: Users attempting admin endpoints
4. **CSRF Validation Failures**: State mismatch in OAuth callback
5. **Session Anomalies**: Multiple concurrent sessions, unusual expiration patterns

---

## Vulnerability Protection

### OWASP Top 10 Coverage

| Vulnerability | Mitigation | Status |
|---------------|------------|--------|
| **A01: Broken Access Control** | RBAC middleware, ownership verification | ✅ Protected |
| **A02: Cryptographic Failures** | HTTPS, secure cookies, session encryption | ✅ Protected |
| **A03: Injection** | Parameterized queries (Drizzle ORM), input validation | ✅ Protected |
| **A04: Insecure Design** | Security-first architecture, threat modeling | ✅ Protected |
| **A05: Security Misconfiguration** | Helmet, secure defaults, environment-based config | ✅ Protected |
| **A06: Vulnerable Components** | Regular `npm audit`, dependency updates | ⚠️ Monitor |
| **A07: Auth Failures** | OAuth2, secure sessions, domain restriction | ✅ Protected |
| **A08: Data Integrity Failures** | Signed cookies, CSRF protection | ✅ Protected |
| **A09: Security Logging Failures** | Structured logging, security event tracking | ✅ Protected |
| **A10: SSRF** | No user-controlled URLs, localhost restrictions | ✅ Protected |

### Additional Protections

- **XSS (Cross-Site Scripting)**: No user input rendered as HTML, React escaping
- **CSRF (Cross-Site Request Forgery)**: State parameter validation, sameSite cookies
- **Session Fixation**: Session regeneration after authentication
- **Clickjacking**: X-Frame-Options header
- **MIME Sniffing**: X-Content-Type-Options header

---

## Security Testing Checklist

### Pre-Deployment Security Audit

#### Authentication & Sessions
- [x] OAuth flow completes successfully
- [x] Domain validation works (accept allowed domain, reject others)
- [x] CSRF protection works (state validation)
- [x] Session cookies are secure (httpOnly, secure in prod, sameSite)
- [x] Session regeneration after authentication
- [x] Sessions persist across server restarts
- [x] Logout destroys session and clears cookies
- [x] Token refresh works correctly

#### Authorization & Access Control
- [x] Unauthenticated requests rejected (401)
- [x] Insufficient permissions rejected (403)
- [x] Role-based endpoints enforce role requirements
- [x] Admin endpoints inaccessible to regular users
- [x] Regular users cannot escalate to admin role

#### Data Isolation
- [x] Users can only see their own photos
- [x] Users cannot access other users' photos
- [x] Photo ownership verified before access
- [x] Admin can view all photos (when enabled)
- [x] Photo creation associates correct accountId
- [x] Photo export filtered by accountId
- [x] No orphaned photos (all photos have accountId)

#### Input Validation
- [x] Invalid email formats rejected
- [x] Invalid domains rejected
- [x] Schema validation on all endpoints
- [x] File upload size limits enforced
- [x] File type validation enforced
- [x] SQL injection attempts fail (parameterized queries)
- [x] XSS attempts fail (no HTML rendering)

#### Network Security
- [x] HTTPS enforced in production
- [x] Security headers set (Helmet)
- [x] CORS restricted to app domain
- [x] Credentials included in requests

---

## Incident Response

### Security Incident Handling

1. **Detection**: Monitor logs for security events
2. **Assessment**: Determine severity and impact
3. **Containment**: Revoke sessions, disable accounts if needed
4. **Eradication**: Fix vulnerability, patch systems
5. **Recovery**: Restore service, verify security
6. **Lessons Learned**: Document incident, update procedures

### Account Compromise Response

If an account is compromised:

1. **Immediate**: Revoke all sessions for the account
   ```bash
   DELETE FROM sessions WHERE sess LIKE '%"accountId":"<account-id>"%';
   ```

2. **Temporary**: Change account role to prevent further damage
   ```sql
   UPDATE accounts SET role = 'user' WHERE id = '<account-id>';
   ```

3. **Audit**: Review account activity logs
   ```bash
   docker logs photomaton-app | grep '"accountId":"<account-id>"'
   ```

4. **Notify**: Inform account owner of potential compromise
5. **Rotate**: Force password/credential reset if applicable

---

## Compliance & Best Practices

### Data Privacy (GDPR Considerations)

- ✅ **User Consent**: Authentication requires explicit user action
- ✅ **Data Minimization**: Only essential data collected
- ✅ **Right to Deletion**: Users can delete their own photos
- ✅ **Data Portability**: Photo export feature (ZIP download)
- ⚠️ **Data Breach Notification**: Implement notification process (if required)

### Security Maintenance

#### Regular Tasks

- **Daily**: Monitor logs for security events
- **Weekly**: Review failed authentication attempts
- **Monthly**: Run `npm audit`, update vulnerable dependencies
- **Quarterly**: Rotate Azure client secrets
- **Annually**: Full security audit, penetration testing

#### Dependency Management

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities (review changes first)
npm audit fix

# Update dependencies
npm update
```

---

## Future Security Enhancements

### Planned Improvements

1. **Multi-Factor Authentication (MFA)**: Enforce MFA for admin accounts
2. **Rate Limiting**: Implement rate limiting on authentication endpoints
3. **IP Allowlisting**: Restrict admin access to specific IP ranges
4. **Audit Logging**: Comprehensive audit trail for all data access
5. **Content Security Policy (CSP)**: Stricter CSP headers
6. **Subresource Integrity (SRI)**: Verify external resource integrity
7. **API Key Authentication**: Support API keys for programmatic access
8. **Webhook Signatures**: Sign webhooks for event notifications

### Security Roadmap

- **Q1 2025**: Rate limiting, MFA for admins
- **Q2 2025**: Comprehensive audit logging
- **Q3 2025**: Penetration testing, security certification
- **Q4 2025**: API key auth, webhook signatures

---

## Contact & Reporting

### Security Vulnerability Reporting

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. **Email**: security@group-era.com (if available)
3. **Include**: Detailed description, steps to reproduce, impact assessment
4. **Response Time**: We aim to respond within 48 hours

### Security Team

- **Security Lead**: TBD
- **Development Team**: Photomaton Engineering
- **Incident Response**: On-call rotation

---

## Conclusion

The Photomaton application implements enterprise-grade security with multiple layers of protection:

1. **Authentication**: Microsoft OAuth2 with domain restriction
2. **Authorization**: Role-based access control (RBAC)
3. **Data Isolation**: Complete multi-tenant separation
4. **Session Security**: Secure server-side sessions with encrypted cookies
5. **Input Validation**: Zod schema validation on all endpoints
6. **Network Security**: HTTPS, security headers, CORS restrictions
7. **Secrets Management**: Environment variables, no committed secrets
8. **Logging & Monitoring**: Structured logging with security event tracking

**Security Status**: ✅ **Production Ready**

All critical security measures are in place and tested. Continue to monitor, maintain, and enhance security posture as the application evolves.

---

**Document Version**: 1.0
**Last Reviewed**: 2025-11-24
**Next Review**: 2025-12-24
**Status**: ✅ Complete
