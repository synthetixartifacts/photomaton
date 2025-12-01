import dotenv from 'dotenv';
import { z } from 'zod';
import { AppConfigSchema, defaultConfig, type AppConfig } from '@photomaton/shared';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const envConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8080').transform(Number),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().default('file:/data/photomaton.db'),
  UPLOAD_DIR: z.string().default('/data/photos'),
  MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:*'),
  IMAGE_PROVIDER: z.string().default('mock'),
  MOCK_DELAY_MS: z.string().default('2000').transform(Number),
  SESSION_SECRET: z.string().default('change-this-in-production'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  ENABLE_DEBUG: z.string().default('false').transform(val => val === 'true'),
  ENABLE_CAROUSEL_AUTO_REFRESH: z.string().default('true').transform(val => val === 'true'),
  CAROUSEL_REFRESH_INTERVAL_MS: z.string().default('5000').transform(Number),
  COUNTDOWN_SECONDS: z.string().optional().transform(val => val ? Number(val) : undefined),
  DISPLAY_TRANSFORMED_SECONDS: z.string().optional().transform(val => val ? Number(val) : undefined),
  MAX_PROCESSING_TIME_SECONDS: z.string().optional().transform(val => val ? Number(val) : undefined),
  ENABLE_WEBSOCKETS: z.string().default('false').transform(val => val === 'true'),
  ENABLE_ADMIN_AUTH: z.string().default('false').transform(val => val === 'true'),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Azure AD Authentication
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  // Google OAuth2 Authentication
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Authentication Configuration
  DOMAIN_EMAIL: z.string().optional(),
  REDIRECT_URI: z.string().optional(),
  // Session Configuration
  SESSION_MAX_AGE: z.string().default('86400000').transform(Number),
  SESSION_NAME: z.string().default('photomaton.sid'),
});

const parseEnvConfig = () => {
  try {
    return envConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

// Parse environment variables
export const envConfig = parseEnvConfig();

// Application configuration class
class ConfigManager {
  private appConfig: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.join('/data', 'config.json');
    this.appConfig = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      // Start with default config - ensure all fields are present
      let config = JSON.parse(JSON.stringify(defaultConfig));

      // Override with environment variables if present
      if (envConfig.COUNTDOWN_SECONDS !== undefined) {
        config.timings.countdownSeconds = envConfig.COUNTDOWN_SECONDS;
      }
      if (envConfig.DISPLAY_TRANSFORMED_SECONDS !== undefined) {
        config.timings.displayTransformedSeconds = envConfig.DISPLAY_TRANSFORMED_SECONDS;
      }
      if (envConfig.MAX_PROCESSING_TIME_SECONDS !== undefined) {
        config.timings.maxProcessingTimeSeconds = envConfig.MAX_PROCESSING_TIME_SECONDS;
      }
      if (envConfig.MOCK_DELAY_MS) {
        config.providers.mockDelayMs = envConfig.MOCK_DELAY_MS;
      }
      if (envConfig.IMAGE_PROVIDER) {
        config.providers.activeProvider = envConfig.IMAGE_PROVIDER;
      }

      config.ui.enableCarouselAutoRefresh = envConfig.ENABLE_CAROUSEL_AUTO_REFRESH;
      config.ui.carouselRefreshIntervalMs = envConfig.CAROUSEL_REFRESH_INTERVAL_MS;

      config.security.sessionSecret = envConfig.SESSION_SECRET;
      config.security.rateLimitWindowMs = envConfig.RATE_LIMIT_WINDOW_MS;
      config.security.rateLimitMaxRequests = envConfig.RATE_LIMIT_MAX_REQUESTS;
      config.security.enableAdminAuth = envConfig.ENABLE_ADMIN_AUTH;
      if (envConfig.ADMIN_USERNAME) {
        config.security.adminUsername = envConfig.ADMIN_USERNAME;
      }

      config.features.enableDebugMode = envConfig.ENABLE_DEBUG;
      config.features.enableWebSockets = envConfig.ENABLE_WEBSOCKETS;

      // Try to load saved config from disk
      try {
        if (fs.existsSync(this.configPath)) {
          const savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));

          // Migration: Add camera config if missing
          if (!savedConfig.camera) {
            savedConfig.camera = defaultConfig.camera;
          }

          // Migration: Add watermark config if missing
          if (!savedConfig.watermark) {
            savedConfig.watermark = defaultConfig.watermark;
          }

          const validated = AppConfigSchema.parse(savedConfig);
          config = validated;
        }
      } catch (error) {
        console.warn('Could not load saved config, using defaults:', error);
      }

      return AppConfigSchema.parse(config);
    } catch (error) {
      console.error('Failed to initialize config:', error);
      return JSON.parse(JSON.stringify(defaultConfig));
    }
  }

  async saveConfig(updates: Partial<AppConfig>): Promise<void> {
    try {
      this.appConfig = AppConfigSchema.parse({ ...this.appConfig, ...updates });
      await fsPromises.mkdir(path.dirname(this.configPath), { recursive: true });
      await fsPromises.writeFile(
        this.configPath,
        JSON.stringify(this.appConfig, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  getConfig(): AppConfig {
    return this.appConfig;
  }

  getTimings() {
    return this.appConfig.timings;
  }

  getUI() {
    return this.appConfig.ui;
  }

  getProviders() {
    return this.appConfig.providers;
  }

  getPresets() {
    return this.appConfig.presets;
  }

  getSecurity() {
    return this.appConfig.security;
  }

  getFeatures() {
    return this.appConfig.features;
  }

  getWatermark() {
    return this.appConfig.watermark;
  }

  updateConfig(updates: any): AppConfig {
    // Deep merge the updates with existing config
    const mergedConfig = this.deepMerge(this.appConfig, updates);
    this.appConfig = AppConfigSchema.parse(mergedConfig);
    // Don't await, save in background
    this.saveConfig(this.appConfig).catch(err =>
      console.error('Failed to persist config:', err)
    );
    return this.appConfig;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }

    return result;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export const config = envConfig;

// Helper to check if we're in production
export const isProduction = () => envConfig.NODE_ENV === 'production';
export const isDevelopment = () => envConfig.NODE_ENV === 'development';
export const isTest = () => envConfig.NODE_ENV === 'test';