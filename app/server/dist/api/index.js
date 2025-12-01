import { Router } from 'express';
import healthRouter from './health.js';
// import photosRouter from './photos.js';
// import transformRouter from './transform.js';
const router = Router();
// Health check endpoints
router.use(healthRouter);
// Photo management endpoints
// router.use('/photos', photosRouter);
// Transform endpoints
// router.use('/transform', transformRouter);
// API info endpoint
router.get('/', (_req, res) => {
    res.json({
        name: 'Photomaton API',
        version: '0.1.0',
        endpoints: {
            health: '/api/healthz',
            ready: '/api/ready',
            photos: '/api/photos',
            capture: '/api/capture',
            transform: '/api/transform'
        }
    });
});
export { router as apiRouter };
//# sourceMappingURL=index.js.map