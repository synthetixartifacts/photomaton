import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * MSAL (Microsoft Authentication Library) Configuration
 * Official library for Azure AD OAuth2 authentication
 */

// Validate required Azure configuration
if (!config.AZURE_CLIENT_ID || !config.AZURE_CLIENT_SECRET || !config.AZURE_TENANT_ID) {
  logger.warn('Azure AD configuration missing - authentication will not be available');
}

// MSAL configuration
const msalConfig: Configuration = {
  auth: {
    clientId: config.AZURE_CLIENT_ID || 'not-configured',
    authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID || 'common'}`,
    clientSecret: config.AZURE_CLIENT_SECRET || 'not-configured',
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        // Only log if doesn't contain PII (Personally Identifiable Information)
        if (!containsPii) {
          switch (loglevel) {
            case LogLevel.Error:
              logger.error({ msal: true }, message);
              break;
            case LogLevel.Warning:
              logger.warn({ msal: true }, message);
              break;
            case LogLevel.Info:
              logger.info({ msal: true }, message);
              break;
            case LogLevel.Verbose:
              logger.debug({ msal: true }, message);
              break;
          }
        }
      },
      piiLoggingEnabled: false, // Never log PII
      logLevel: config.NODE_ENV === 'production' ? LogLevel.Error : LogLevel.Info,
    },
  },
};

// Create MSAL client instance
export const msalClient = new ConfidentialClientApplication(msalConfig);

/**
 * Auth request configuration for obtaining authorization code
 */
export const authCodeRequest = {
  scopes: ['user.read', 'email', 'profile', 'openid'],
  redirectUri: config.REDIRECT_URI || 'https://photomaton.group-era.com/connect/azure/check',
};

/**
 * Token request configuration for API calls
 */
export const tokenRequest = {
  scopes: ['user.read', 'email', 'profile'],
};

/**
 * Check if Azure AD is properly configured
 */
export function isAzureConfigured(): boolean {
  return !!(config.AZURE_CLIENT_ID && config.AZURE_CLIENT_SECRET && config.AZURE_TENANT_ID);
}
