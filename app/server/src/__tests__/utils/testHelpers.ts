import type { Account, UserRole } from '@photomaton/shared';
import type { AuthenticationResult, AccountInfo } from '@azure/msal-node';

/**
 * Create mock account for testing
 */
export function createMockAccount(overrides?: Partial<Account>): Account {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    microsoftId: `test-ms-${crypto.randomUUID()}`,
    email: 'test@group-era.com',
    name: 'Test User',
    role: 'user',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    metadata: null,
    ...overrides,
  };
}

/**
 * Create mock admin account for testing
 */
export function createMockAdminAccount(overrides?: Partial<Account>): Account {
  return createMockAccount({
    email: 'admin@group-era.com',
    name: 'Test Admin',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Create mock MSAL authentication result
 */
export function createMockAuthResult(
  email: string = 'test@group-era.com',
  name: string = 'Test User'
): AuthenticationResult {
  const homeAccountId = `test-ms-${crypto.randomUUID()}`;

  return {
    authority: 'https://login.microsoftonline.com/test-tenant',
    uniqueId: homeAccountId,
    tenantId: 'test-tenant-id',
    scopes: ['user.read', 'email', 'profile'],
    account: {
      homeAccountId,
      environment: 'login.microsoftonline.com',
      tenantId: 'test-tenant-id',
      username: email,
      localAccountId: 'test-local-id',
      name,
    } as AccountInfo,
    idToken: 'mock-id-token',
    idTokenClaims: {
      email,
      name,
      oid: homeAccountId,
      sub: 'test-subject',
      iss: 'https://login.microsoftonline.com/test-tenant',
      aud: 'test-client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    },
    accessToken: 'mock-access-token',
    fromCache: false,
    expiresOn: new Date(Date.now() + 3600000),
    tokenType: 'Bearer',
    correlationId: crypto.randomUUID(),
  };
}

/**
 * Create mock Express request with session
 */
export function createMockRequest(account?: Account) {
  return {
    session: account
      ? {
          accountId: account.id,
          microsoftId: account.microsoftId,
          email: account.email,
          role: account.role,
        }
      : {},
    account,
    params: {},
    query: {},
    body: {},
    headers: {},
  };
}

/**
 * Create mock Express response
 */
export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create mock Express next function
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
