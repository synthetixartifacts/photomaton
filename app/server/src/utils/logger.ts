import pino from 'pino';
import { config } from '../config/index.js';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = process.env.LOGS_DIR || '/data/logs';
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error(`Failed to create logs directory: ${error}`);
}

// For development, use pretty printing to console
const isDev = config.NODE_ENV === 'development';

// Create the logger instance
// In production, write to file. In development, write to console with pretty printing
export const logger = isDev
  ? pino({
      name: 'photomaton',
      level: config.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    })
  : pino({
      name: 'photomaton',
      level: config.LOG_LEVEL || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        }
      },
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown',
        environment: config.NODE_ENV,
        provider: config.IMAGE_PROVIDER
      }
    }, process.stdout); // Always use stdout in production

// Create a separate error logger (always use stderr to avoid file permission issues)
export const errorLogger = pino(
  {
    name: 'photomaton-errors',
    level: 'error'
  },
  process.stderr
);

// Create child loggers for specific modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Log startup information
logger.info({
  logsDir,
  level: config.LOG_LEVEL,
  environment: config.NODE_ENV
}, 'Logging system initialized');

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  // Try to log but don't fail if logging fails
  try {
    logger.fatal({ error }, 'Uncaught exception');
  } catch (e) {
    console.error('Failed to log uncaught exception:', error);
  }

  try {
    errorLogger.fatal({ error }, 'Uncaught exception');
  } catch (e) {
    console.error('Failed to log uncaught exception to error logger:', error);
  }

  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  // Try to log but don't fail if logging fails
  try {
    logger.fatal({ reason, promise }, 'Unhandled rejection');
  } catch (e) {
    console.error('Unhandled rejection:', reason);
  }

  try {
    errorLogger.fatal({ reason, promise }, 'Unhandled rejection');
  } catch (e) {
    console.error('Failed to log unhandled rejection to error logger:', reason);
  }

  process.exit(1);
});

export default logger;