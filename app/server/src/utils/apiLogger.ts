import pino from 'pino';
import { promises as fs } from 'fs';
import path from 'path';

const API_LOG_PATH = '/data/logs/api_calls.log';
const API_LOG_DIR = path.dirname(API_LOG_PATH);

// Create a dedicated logger for API calls
// In production, only log to file. In development, also log to console
const transportTargets: any[] = [
  {
    target: 'pino/file',
    options: { destination: API_LOG_PATH }
  }
];

// Only add pretty printing in development
if (process.env.NODE_ENV !== 'production') {
  transportTargets.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname'
    }
  });
}

const apiLogger = process.env.NODE_ENV === 'production'
  ? pino({
      name: 'api-calls',
      level: 'debug'
    })
  : pino({
      name: 'api-calls',
      level: 'debug',
      transport: {
        targets: transportTargets
      }
    });

// Ensure log directory exists
async function ensureLogDirectory() {
  try {
    await fs.mkdir(API_LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

ensureLogDirectory();

export interface APICallLog {
  provider: string;
  method: string;
  endpoint?: string;
  request: {
    headers?: Record<string, string>;
    body?: any;
    params?: any;
    photoId?: string;
    preset?: string;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    error?: any;
  };
  duration?: number;
  timestamp: Date;
  success: boolean;
}

export class APICallLogger {
  private startTime: number;
  private log: APICallLog;

  constructor(provider: string, method: string, endpoint?: string) {
    this.startTime = Date.now();
    this.log = {
      provider,
      method,
      endpoint,
      request: {},
      timestamp: new Date(),
      success: false
    };
  }

  setRequest(data: {
    headers?: Record<string, string>;
    body?: any;
    params?: any;
    photoId?: string;
    preset?: string;
  }) {
    // Sanitize sensitive data
    const sanitizedHeaders = { ...data.headers };
    if (sanitizedHeaders['Authorization']) {
      sanitizedHeaders['Authorization'] = sanitizedHeaders['Authorization'].substring(0, 20) + '...';
    }
    if (sanitizedHeaders['x-api-key']) {
      sanitizedHeaders['x-api-key'] = sanitizedHeaders['x-api-key'].substring(0, 10) + '...';
    }

    this.log.request = {
      ...data,
      headers: sanitizedHeaders
    };

    apiLogger.debug({
      ...this.log,
      phase: 'request'
    }, `API Request: ${this.log.provider} - ${this.log.method}`);
  }

  setResponse(data: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
  }) {
    this.log.response = data;
    this.log.duration = Date.now() - this.startTime;
    this.log.success = data.status ? data.status >= 200 && data.status < 300 : false;

    apiLogger.info({
      ...this.log,
      phase: 'response'
    }, `API Response: ${this.log.provider} - ${this.log.method} - ${data.status} (${this.log.duration}ms)`);
  }

  setError(error: any) {
    this.log.duration = Date.now() - this.startTime;
    this.log.success = false;
    this.log.response = {
      error: {
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        code: error.code,
        stack: error.stack
      }
    };

    apiLogger.error({
      ...this.log,
      phase: 'error'
    }, `API Error: ${this.log.provider} - ${this.log.method} - ${error.message} (${this.log.duration}ms)`);
  }

  async writeToFile() {
    try {
      // Write a formatted version to the log file
      const logEntry = `
================================================================================
TIMESTAMP: ${this.log.timestamp.toISOString()}
PROVIDER: ${this.log.provider}
METHOD: ${this.log.method}
ENDPOINT: ${this.log.endpoint || 'N/A'}
DURATION: ${this.log.duration}ms
SUCCESS: ${this.log.success}

REQUEST:
${JSON.stringify(this.log.request, null, 2)}

RESPONSE:
${JSON.stringify(this.log.response, null, 2)}
================================================================================
`;
      await fs.appendFile(API_LOG_PATH, logEntry);
    } catch (error) {
      console.error('Failed to write API log to file:', error);
    }
  }
}

// Helper function to create a logger instance
export function createAPILogger(provider: string, method: string, endpoint?: string): APICallLogger {
  return new APICallLogger(provider, method, endpoint);
}

// Export the logger for direct use
export { apiLogger };