import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ProviderError } from '../providers/types.js';
import { ERROR_CODES } from '@photomaton/shared';
import pino from 'pino';

const logger = pino({ name: 'error-handler' });

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response | void {
  // Log the error
  logger.error({
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body
    }
  }, 'Request error');

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.errors
      }
    });
  }

  // Handle custom validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: err.message,
        details: err.details
      }
    });
  }

  // Handle provider errors
  if (err instanceof ProviderError) {
    return res.status(503).json({
      error: {
        code: ERROR_CODES.PROVIDER_ERROR,
        message: 'Image transformation service unavailable',
        retry: true
      }
    });
  }

  // Handle database errors
  if (err instanceof DatabaseError) {
    return res.status(500).json({
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Database operation failed'
      }
    });
  }

  // Handle file errors
  if (err instanceof FileError) {
    return res.status(500).json({
      error: {
        code: ERROR_CODES.FILE_ERROR,
        message: err.message
      }
    });
  }

  // Handle generic errors
  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }
  });
}