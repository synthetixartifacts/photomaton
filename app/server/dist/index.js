import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { apiRouter } from './api/index.js';
import { errorHandler } from './middleware/error.js';
import { runMigrations } from './db/index.js';
import { providerManager } from './providers/manager.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Create logger
const logger = pino({
    name: 'photomaton',
    level: config.LOG_LEVEL
});
// Create Express app
const app = express();
// Middleware
app.use(pinoHttp({ logger }));
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from client build in production
if (config.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientPath));
}
// API routes
app.use('/api', apiRouter);
// Serve client app for all other routes in production
if (config.NODE_ENV === 'production') {
    app.get('*', (_req, res) => {
        const clientPath = path.join(__dirname, '../../client/dist/index.html');
        res.sendFile(clientPath);
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
        // Validate provider configuration
        await providerManager.validateProvider();
        logger.info(`Provider '${process.env.IMAGE_PROVIDER || 'mock'}' validated`);
        // Start listening
        const server = app.listen(config.PORT, () => {
            logger.info({
                port: config.PORT,
                environment: config.NODE_ENV,
                provider: process.env.IMAGE_PROVIDER || 'mock'
            }, `Server running on port ${config.PORT}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger.error(error, 'Failed to start server');
        process.exit(1);
    }
}
// Start the server
startServer();
//# sourceMappingURL=index.js.map