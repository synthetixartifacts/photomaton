import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import fs from 'fs';
import session from 'express-session';
import helmet from 'helmet';
import { config, configManager } from './config/index.js';
import { sessionConfig } from './config/session.js';
import { apiRouter } from './api/index.js';
import { authRouter } from './api/auth.js';
import { errorHandler } from './middleware/error.js';
import { runMigrations } from './db/index.js';
import { providerManager } from './providers/manager.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Express app
const app = express();

// Trust proxy - required for secure cookies behind Nginx/reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(pinoHttp({ logger }));

// Security middleware - Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now, configure later if needed
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Required for Google Sign-In popup
}));

// CORS - allow credentials for session cookies
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - MUST be before routes that use sessions
app.use(session(sessionConfig));

// Serve static files from client build in production
if (config.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
}

// Serve preset images
app.use('/preset-images', express.static('/data/presets', {
  maxAge: '7d', // Cache for 7 days
  etag: true,
  lastModified: true
}));

// Authentication routes - BEFORE other API routes
app.use('/auth', authRouter);
app.use('/connect/azure', authRouter); // OAuth callback route

// API routes
app.use('/api', apiRouter);

// Serve client app for all other routes in production
if (config.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
      const clientPath = path.join(__dirname, '../../client/dist/index.html');
      res.sendFile(clientPath);
    } else {
      next();
    }
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    logger.info('Starting Photomaton server...');

    // Run database migrations
    await runMigrations();
    logger.info('Database migrations completed');

    // Initialize storage service
    const { storageService } = await import('./services/storage.js');
    await storageService.initialize();
    logger.info('Storage service initialized');

    // Initialize preset storage service
    const { presetStorageService } = await import('./services/presetStorage.js');
    await presetStorageService.initialize();
    logger.info('Preset storage service initialized');

    // Validate provider configuration
    await providerManager.validateProvider();
    logger.info(`Provider '${process.env.IMAGE_PROVIDER || 'mock'}' validated`);

    // Initialize watermark service
    const { initializeWatermarkService } = await import('./services/watermark.js');
    const watermarkConfig = configManager.getWatermark();
    const watermarkService = initializeWatermarkService(watermarkConfig);
    const watermarkValid = await watermarkService.validateWatermarkFile();
    logger.info({
      enabled: watermarkConfig.enabled,
      path: watermarkConfig.watermarkPath,
      fileExists: watermarkValid
    }, 'Watermark service initialized');

    // Start listening - use HTTPS if certificates exist
    let server;
    const certsPath = '/certs';
    const keyPath = path.join(certsPath, 'key.pem');
    const certPath = path.join(certsPath, 'cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      // HTTPS server with self-signed certificate
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      server = https.createServer(httpsOptions, app).listen(config.PORT, () => {
        logger.info({
          port: config.PORT,
          environment: config.NODE_ENV,
          provider: process.env.IMAGE_PROVIDER || 'mock',
          protocol: 'HTTPS'
        }, `HTTPS Server running on port ${config.PORT}`);
      });

      // Also create HTTP server that redirects to HTTPS
      const httpPort = parseInt(config.PORT.toString()) + 1000;
      http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host?.replace(`:${httpPort}`, `:${config.PORT}`)}${req.url}` });
        res.end();
      }).listen(httpPort, () => {
        logger.info(`HTTP redirect server running on port ${httpPort}`);
      });
    } else {
      // Fallback to HTTP
      server = app.listen(config.PORT, () => {
        logger.info({
          port: config.PORT,
          environment: config.NODE_ENV,
          provider: process.env.IMAGE_PROVIDER || 'mock',
          protocol: 'HTTP'
        }, `HTTP Server running on port ${config.PORT}`);
      });
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();