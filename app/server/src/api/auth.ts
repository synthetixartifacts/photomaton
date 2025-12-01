import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth/authService.js';
import { accountService } from '../services/accountService.js';
import { userLimitService } from '../services/userLimitService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

// Validation schema for Google login
const GoogleLoginSchema = z.object({
  credential: z.string().min(1, 'ID token is required'),
});

const router = Router();

/**
 * GET /auth/login
 * Initiate Microsoft OAuth2 login
 */
router.get('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if Azure AD is configured
    if (!authService.isConfigured()) {
      logger.error('Azure AD not configured - cannot initiate login');
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Authentication service is not configured',
        },
      });
      return;
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    req.session.authState = state;

    // Store redirect URL if provided
    const redirectTo = (req.query.redirect as string) || '/';
    req.session.redirectAfterLogin = redirectTo;

    // Save session before redirect
    req.session.save((err: any) => {
      if (err) {
        logger.error({ error: err }, 'Failed to save session before redirect');
        next(err);
        return;
      }

      // Generate authorization URL
      authService.getAuthUrl(state).then((authUrl) => {
        // Redirect to Microsoft login
        res.redirect(authUrl);
      }).catch(next);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to initiate login');
    next(error);
  }
});

/**
 * GET /connect/azure/check
 * OAuth2 callback - exchange code for tokens
 */
router.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.warn({ error, error_description }, 'OAuth error received');
      return res.redirect('/?error=auth_failed');
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      return res.redirect('/?error=missing_code');
    }

    // Validate CSRF state
    if (state !== req.session.authState) {
      logger.warn(
        { expectedState: req.session.authState, receivedState: state },
        'State mismatch - potential CSRF attack'
      );
      return res.redirect('/?error=invalid_state');
    }

    // Exchange code for tokens
    const authResult = await authService.acquireTokenByCode(code);

    // Authenticate or create user
    const { account, isNewUser } = await authService.authenticateUser(authResult);

    // Regenerate session ID (security best practice)
    req.session.regenerate((err: any) => {
      if (err) {
        logger.error({ error: err }, 'Failed to regenerate session');
        res.redirect('/?error=session_error');
        return;
      }

      // Store session data
      const sessionData = authService.createSessionData(account, authResult);
      Object.assign(req.session, sessionData);

      // Clear temporary auth state
      delete req.session.authState;

      // Get redirect URL
      const redirectTo = req.session.redirectAfterLogin || '/';
      delete req.session.redirectAfterLogin;

      logger.info(
        { accountId: account.id, email: account.email, isNewUser },
        'User authenticated successfully'
      );

      // Redirect to app
      res.redirect(redirectTo);
    });
  } catch (error: any) {
    logger.error({ error }, 'Authentication callback failed');

    // Handle domain validation errors
    if (error.message?.includes('email addresses are allowed')) {
      res.redirect('/?error=invalid_domain');
      return;
    }

    res.redirect('/?error=auth_failed');
  }
});

/**
 * POST /auth/logout
 * Destroy session and log out
 */
router.post('/logout', (req: Request, res: Response): void => {
  const accountId = req.session.accountId;

  req.session.destroy((err: any) => {
    if (err) {
      logger.error({ error: err, accountId }, 'Failed to destroy session');
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }

    // Clear session cookie
    res.clearCookie('photomaton.sid');

    logger.info({ accountId }, 'User logged out');
    res.json({ success: true });
  });
});

/**
 * POST /auth/google
 * Authenticate with Google ID token
 */
router.post('/google', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if Google is configured
    if (!authService.isGoogleConfigured()) {
      logger.error('Google OAuth not configured - cannot process Google login');
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Google authentication is not configured',
        },
      });
      return;
    }

    // Validate request body
    const parseResult = GoogleLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.errors,
        },
      });
      return;
    }

    const { credential } = parseResult.data;

    // Authenticate user with Google
    const { account, isNewUser } = await authService.authenticateWithGoogle(credential);

    // Regenerate session ID (security best practice)
    req.session.regenerate((err: any) => {
      if (err) {
        logger.error({ error: err }, 'Failed to regenerate session for Google auth');
        res.status(500).json({
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to create session',
          },
        });
        return;
      }

      // Store session data
      const sessionData = authService.createGoogleSessionData(account);
      Object.assign(req.session, sessionData);

      logger.info(
        { accountId: account.id, email: account.email, isNewUser },
        'User authenticated with Google'
      );

      // Return success with account data
      res.json({
        success: true,
        data: {
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          isNewUser,
        },
      });
    });
  } catch (error: any) {
    logger.error({ error }, 'Google authentication failed');

    // Handle token errors
    if (error.message?.includes('Invalid Google') || error.message?.includes('token')) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication failed - invalid token',
        },
      });
      return;
    }

    next(error);
  }
});

/**
 * GET /auth/config
 * Return available auth providers (for frontend to show appropriate buttons)
 */
router.get('/config', (_req: Request, res: Response): void => {
  res.json({
    providers: {
      microsoft: authService.isConfigured(),
      google: authService.isGoogleConfigured(),
    },
    domainRestriction: config.DOMAIN_EMAIL || null,
  });
});

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session.accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const account = await accountService.getById(req.session.accountId);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Return safe account data (exclude sensitive fields)
    res.json({
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      createdAt: account.createdAt,
      metadata: account.metadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /auth/me/preferences
 * Update current user's preferences (camera settings, etc.)
 */
router.put('/me/preferences', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session.accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const account = await accountService.getById(req.session.accountId);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'Invalid preferences format' });
      return;
    }

    // Merge new preferences with existing metadata
    const updatedMetadata = {
      ...account.metadata,
      preferences: {
        ...account.metadata?.preferences,
        ...preferences,
      },
    };

    const updatedAccount = await accountService.updateMetadata(account.id, updatedMetadata);

    logger.info({ accountId: account.id }, 'User preferences updated');

    res.json({
      success: true,
      preferences: updatedAccount.metadata?.preferences,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update user preferences');
    next(error);
  }
});

/**
 * GET /auth/me/limits
 * Get current user's photo limit information
 */
router.get('/me/limits', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session.accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const account = await accountService.getById(req.session.accountId);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const limitInfo = await userLimitService.getUserLimitInfo(account);
    res.json(limitInfo);
  } catch (error) {
    logger.error({ error }, 'Failed to get user limit info');
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.session;

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token available' });
      return;
    }

    const authResult = await authService.refreshAccessToken(refreshToken);

    // Update session with new tokens
    req.session.accessToken = authResult.accessToken;
    req.session.tokenExpiry = authResult.expiresOn?.getTime();

    req.session.save((err: any) => {
      if (err) {
        logger.error({ error: err }, 'Failed to save refreshed session');
        next(err);
        return;
      }
      res.json({ success: true });
    });
  } catch (error) {
    logger.error({ error }, 'Token refresh failed');
    next(error);
  }
});

export { router as authRouter };
