import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../authService.js';
import { accountService } from '../../accountService.js';
import { createMockAuthResult } from '../../../__tests__/utils/testHelpers.js';

// Mock config
vi.mock('../../../config/index.js', () => ({
  config: {
    DOMAIN_EMAIL: 'group-era.com',
    AZURE_CLIENT_ID: 'test-client-id',
    AZURE_TENANT_ID: 'test-tenant-id',
    AZURE_CLIENT_SECRET: 'test-secret',
    REDIRECT_URI: 'https://test.com/callback',
  },
}));

// Mock MSAL client
vi.mock('../msalConfig.js', () => ({
  msalClient: {
    getAuthCodeUrl: vi.fn().mockResolvedValue('https://login.microsoftonline.com/auth'),
    acquireTokenByCode: vi.fn(),
    acquireTokenByRefreshToken: vi.fn(),
  },
  authCodeRequest: {
    scopes: ['user.read', 'email', 'profile', 'openid'],
    redirectUri: 'https://test.com/callback',
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('validateEmailDomain', () => {
    it('should validate email with correct domain', () => {
      expect(authService.validateEmailDomain('user@group-era.com')).toBe(true);
    });

    it('should reject email with incorrect domain', () => {
      expect(authService.validateEmailDomain('user@other.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(authService.validateEmailDomain('user@GROUP-ERA.COM')).toBe(true);
      expect(authService.validateEmailDomain('user@Group-Era.Com')).toBe(true);
    });

    it('should handle emails without domain', () => {
      expect(authService.validateEmailDomain('invalid-email')).toBe(false);
    });
  });

  describe('authenticateUser', () => {
    it('should create new user on first login', async () => {
      const authResult = createMockAuthResult('newuser@group-era.com', 'New User');

      const result = await authService.authenticateUser(authResult);

      expect(result.isNewUser).toBe(true);
      expect(result.account.email).toBe('newuser@group-era.com');
      expect(result.account.name).toBe('New User');
      expect(result.account.role).toBe('user');
    });

    it('should update existing user on subsequent login', async () => {
      // First login - create user
      const authResult1 = createMockAuthResult('existing@group-era.com', 'Existing User');
      const { account: createdAccount } = await authService.authenticateUser(authResult1);

      // Second login - update user
      const authResult2 = createMockAuthResult('existing@group-era.com', 'Updated Name');
      authResult2.account!.homeAccountId = createdAccount.microsoftId; // Same Microsoft ID

      const result = await authService.authenticateUser(authResult2);

      expect(result.isNewUser).toBe(false);
      expect(result.account.id).toBe(createdAccount.id);
      expect(result.account.name).toBe('Updated Name');
    });

    it('should reject user with invalid domain', async () => {
      const authResult = createMockAuthResult('user@invalid.com', 'Invalid User');

      await expect(authService.authenticateUser(authResult)).rejects.toThrow(
        'Only group-era.com email addresses are allowed'
      );
    });

    it('should assign user role by default', async () => {
      const authResult = createMockAuthResult('user@group-era.com', 'User');

      const result = await authService.authenticateUser(authResult);

      expect(result.account.role).toBe('user');
    });

    it('should handle authentication result without claims', async () => {
      const authResult = createMockAuthResult('test@group-era.com', 'Test');
      delete authResult.idTokenClaims;

      // Should still work using account info
      const result = await authService.authenticateUser(authResult);

      expect(result.account.email).toBe('test@group-era.com');
    });
  });

  describe('createSessionData', () => {
    it('should create session data from account and auth result', async () => {
      const authResult = createMockAuthResult('user@group-era.com', 'User');
      const { account } = await authService.authenticateUser(authResult);

      const sessionData = authService.createSessionData(account, authResult);

      expect(sessionData).toEqual({
        accountId: account.id,
        microsoftId: account.microsoftId,
        email: account.email,
        role: account.role,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        tokenExpiry: authResult.expiresOn?.getTime(),
      });
    });
  });

  describe('getAuthUrl', () => {
    it('should generate authorization URL with state', async () => {
      const state = 'test-state-token';

      const url = await authService.getAuthUrl(state);

      expect(url).toBe('https://login.microsoftonline.com/auth');
    });
  });
});
