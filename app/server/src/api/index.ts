import { Router } from 'express';
import healthRouter from './health.js';
import { photosRouter } from './photos.js';
import { transformRouter } from './transform.js';
import { captureRouter } from './capture.js';
import configRouter from './config.js';
import { presetsRouter } from './presets.js';
import { accountsRouter } from './admin/accounts.js';
import { exportRouter } from './export.js';

const router = Router();

// Health check endpoints (public - no auth required)
router.use(healthRouter);

// Authentication endpoints are mounted at /auth in server/index.ts (not here)

// Photo management endpoints (protected)
router.use('/photos', photosRouter);

// Photo export endpoints (protected)
router.use('/photos/export', exportRouter);

// Capture endpoint (protected)
router.use('/capture', captureRouter);

// Transform endpoints (protected - check if needs auth)
router.use('/transform', transformRouter);

// Configuration endpoints (public GET, admin-only PUT/POST)
router.use(configRouter);

// Presets endpoints (check if needs auth)
router.use('/presets', presetsRouter);

// Admin endpoints (admin-only)
router.use('/admin/accounts', accountsRouter);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'Photomaton API',
    version: '0.1.0',
    endpoints: {
      health: '/api/healthz',
      ready: '/api/ready',
      auth: '/auth',
      photos: '/api/photos',
      export: '/api/photos/export',
      capture: '/api/capture',
      transform: '/api/transform',
      config: '/api/config',
      presets: '/api/presets',
      admin: '/api/admin/accounts'
    }
  });
});

export { router as apiRouter };