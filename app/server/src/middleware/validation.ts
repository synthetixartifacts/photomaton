import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'validation' });

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ error: error.flatten(), body: req.body }, 'Validation failed');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.flatten()
          }
        });
      }
      return next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.query);
      // Don't reassign req.query in Express 5, just validate
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ error: error.flatten(), query: req.query }, 'Query validation failed');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.flatten()
          }
        });
      }
      return next(error);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.params);
      // Don't reassign req.params in Express 5, just validate
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ error: error.flatten(), params: req.params }, 'Params validation failed');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid path parameters',
            details: error.flatten()
          }
        });
      }
      return next(error);
    }
  };
}