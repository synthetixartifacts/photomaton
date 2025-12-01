import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Google OAuth2 Service
 * Handles Google ID token verification using Google's official library
 */

// Validate configuration
if (!config.GOOGLE_CLIENT_ID) {
  logger.warn('Google OAuth not configured - Google authentication will not be available');
}

// Create OAuth2 client for token verification
const googleClient = config.GOOGLE_CLIENT_ID
  ? new OAuth2Client(config.GOOGLE_CLIENT_ID)
  : null;

/**
 * Google token payload interface
 * Based on the standard OpenID Connect claims from Google
 */
export interface GoogleTokenPayload {
  sub: string; // Google user ID (unique, stable identifier)
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  hd?: string; // Hosted domain (for Google Workspace accounts)
  aud: string; // Audience (client ID)
  iss: string; // Issuer
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

/**
 * Check if Google OAuth is properly configured
 */
export function isGoogleConfigured(): boolean {
  return !!config.GOOGLE_CLIENT_ID && !!googleClient;
}

/**
 * Verify Google ID token and extract payload
 *
 * This function verifies:
 * - Token signature (cryptographic verification)
 * - Audience (aud) matches our client ID
 * - Token is not expired (exp)
 * - Issuer (iss) is Google
 *
 * @param idToken - JWT ID token from Google Sign-In
 * @returns Token payload with user information
 * @throws Error if token is invalid or verification fails
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  if (!googleClient) {
    throw new Error('Google OAuth is not configured');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('No payload in token');
    }

    if (!payload.email) {
      throw new Error('No email in token');
    }

    if (!payload.email_verified) {
      throw new Error('Email not verified by Google');
    }

    logger.debug({ email: payload.email, sub: payload.sub }, 'Google ID token verified successfully');

    return payload as GoogleTokenPayload;
  } catch (error: any) {
    // Log the specific error for debugging but return generic message
    logger.error({ error: error.message }, 'Failed to verify Google ID token');

    // Provide more specific error messages for common issues
    if (error.message?.includes('Token used too late')) {
      throw new Error('Google token has expired');
    }
    if (error.message?.includes('Invalid token signature')) {
      throw new Error('Invalid Google token signature');
    }
    if (error.message?.includes('Wrong recipient')) {
      throw new Error('Google token was not issued for this application');
    }

    throw new Error('Invalid Google ID token');
  }
}
