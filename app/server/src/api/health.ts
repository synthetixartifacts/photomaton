import { Router } from 'express';
import { db } from '../db/index.js';
import { providerManager } from '../providers/manager.js';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/healthz', async (_req, res) => {
  try {
    // Check database connection
    await db.run(sql`SELECT 1`);

    // Check provider availability
    const provider = await providerManager.getProvider();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      provider: provider.name,
      version: process.env.npm_package_version || '0.1.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/ready', async (_req, res) => {
  try {
    // Check if all services are ready
    await db.run(sql`SELECT 1`);
    await providerManager.validateProvider();

    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready'
    });
  }
});

export default router;