import { msalClient, authCodeRequest, isAzureConfigured } from './msalConfig.js';
import { verifyGoogleIdToken, isGoogleConfigured } from './googleAuthService.js';
import { accountService } from '../accountService.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import type { AuthenticationResult } from '@azure/msal-node';
import type { Account, SessionData } from '@photomaton/shared';

/**
 * Authentication Service
 * Handles Microsoft and Google OAuth2 authentication flows
 */
export class AuthService {
  /**
   * Check if Azure AD is configured
   */
  isConfigured(): boolean {
    return isAzureConfigured();
  }

  /**
   * Generate Microsoft OAuth2 authorization URL
   */
  async getAuthUrl(state: string): Promise<string> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Azure AD is not configured');
      }

      const authUrlParams = {
        ...authCodeRequest,
        state,
        prompt: 'select_account', // Force account selection
      };

      const authUrl = await msalClient.getAuthCodeUrl(authUrlParams);
      return authUrl;
    } catch (error) {
      logger.error({ error }, 'Failed to generate auth URL');
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async acquireTokenByCode(code: string): Promise<AuthenticationResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Azure AD is not configured');
      }

      const tokenRequest = {
        ...authCodeRequest,
        code,
      };

      const response = await msalClient.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error('No response from token acquisition');
      }

      return response;
    } catch (error) {
      logger.error({ error }, 'Failed to acquire token');
      throw new Error('Failed to acquire access token');
    }
  }

  /**
   * Check if email is from internal domain (for logging/info purposes)
   * Note: Domain restriction removed - all emails allowed, but internal users get higher limits
   */
  isInternalEmail(email: string): boolean {
    const internalDomain = config.DOMAIN_EMAIL;
    if (!internalDomain) return false;

    const emailDomain = email.split('@')[1]?.toLowerCase();
    return emailDomain === internalDomain.toLowerCase();
  }

  /**
   * Create or update account from Microsoft profile
   */
  async authenticateUser(
    authResult: AuthenticationResult
  ): Promise<{ account: Account; isNewUser: boolean }> {
    const { account: msalAccount, idTokenClaims } = authResult;

    if (!msalAccount || !idTokenClaims) {
      throw new Error('Invalid authentication result');
    }

    const email = (idTokenClaims as any).email || (idTokenClaims as any).preferred_username || msalAccount.username;
    const name = (idTokenClaims as any).name || msalAccount.name;
    const microsoftId = msalAccount.homeAccountId;

    // Log whether this is an internal or external user (no restriction, just info)
    const isInternal = this.isInternalEmail(email);
    logger.info({ email, isInternal }, 'Microsoft authentication - user type determined');

    // Get or create account
    let account = await accountService.getByMicrosoftId(microsoftId);
    let isNewUser = false;

    if (!account) {
      // Create new account
      account = await accountService.create({
        microsoftId,
        email,
        name,
        role: 'user', // Default role
        metadata: {
          microsoftProfile: {
            jobTitle: (idTokenClaims as any).jobTitle,
            department: (idTokenClaims as any).department,
          },
        },
      });
      isNewUser = true;
      logger.info({ accountId: account.id, email }, 'New account created');
    } else {
      // Update last login and profile info
      account = await accountService.updateLastLogin(account.id, {
        name,
        metadata: {
          ...account.metadata,
          microsoftProfile: {
            jobTitle: (idTokenClaims as any).jobTitle,
            department: (idTokenClaims as any).department,
          },
        },
      });
      logger.info({ accountId: account.id, email }, 'Existing account updated');
    }

    return { account, isNewUser };
  }

  /**
   * Create session data from Microsoft account
   */
  createSessionData(
    account: Account,
    authResult: AuthenticationResult
  ): SessionData {
    return {
      accountId: account.id,
      email: account.email,
      role: account.role,
      authProvider: 'microsoft',
      microsoftId: account.microsoftId,
      accessToken: authResult.accessToken,
      refreshToken: (authResult as any).refreshToken, // MSAL may include this in some flows
      tokenExpiry: authResult.expiresOn?.getTime(),
    };
  }

  // ==================== Google OAuth Methods ====================

  /**
   * Check if Google OAuth is configured
   */
  isGoogleConfigured(): boolean {
    return isGoogleConfigured();
  }

  /**
   * Authenticate user with Google ID token
   */
  async authenticateWithGoogle(
    idToken: string
  ): Promise<{ account: Account; isNewUser: boolean }> {
    // Verify the token with Google
    const payload = await verifyGoogleIdToken(idToken);

    const { sub: googleId, email, name, picture, locale } = payload;

    // Log whether this is an internal or external user (no restriction, just info)
    const isInternal = this.isInternalEmail(email);
    logger.info({ email, isInternal }, 'Google authentication - user type determined');

    // Try to find existing account by Google ID first
    let account = await accountService.getByGoogleId(googleId);
    let isNewUser = false;

    if (!account) {
      // Try to find by email (might have existing Microsoft account)
      account = await accountService.getByEmail(email);

      if (account) {
        // Link Google to existing account
        account = await accountService.linkGoogleAccount(account.id, googleId, {
          googleProfile: { picture, locale },
        });
        logger.info({ accountId: account.id, email }, 'Google account linked to existing account');
      } else {
        // Create new account with Google
        account = await accountService.createWithGoogle({
          googleId,
          email,
          name,
          role: 'user',
          metadata: {
            avatarUrl: picture,
            googleProfile: { picture, locale },
            lastAuthProvider: 'google',
          },
        });
        isNewUser = true;
        logger.info({ accountId: account.id, email }, 'New account created with Google');
      }
    } else {
      // Update last login and profile info
      account = await accountService.updateLastLogin(account.id, {
        name,
        metadata: {
          ...account.metadata,
          avatarUrl: picture || account.metadata?.avatarUrl,
          googleProfile: { picture, locale },
          lastAuthProvider: 'google',
        },
      });
      logger.info({ accountId: account.id, email }, 'Google account login updated');
    }

    return { account, isNewUser };
  }

  /**
   * Create session data from Google authentication
   */
  createGoogleSessionData(account: Account): SessionData {
    return {
      accountId: account.id,
      email: account.email,
      role: account.role,
      authProvider: 'google',
      googleId: account.googleId,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthenticationResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Azure AD is not configured');
      }

      const tokenRequest = {
        scopes: authCodeRequest.scopes,
        refreshToken,
      };

      const response = await msalClient.acquireTokenByRefreshToken(tokenRequest);

      if (!response) {
        throw new Error('No response from token refresh');
      }

      return response;
    } catch (error) {
      logger.error({ error }, 'Failed to refresh token');
      throw new Error('Failed to refresh access token');
    }
  }
}

export const authService = new AuthService();
