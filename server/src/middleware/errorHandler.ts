import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Database validation failed', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, 400, 'INVALID_ID', `Invalid value for ${err.path}`);
  }

  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const duplicateField = keyValue ? Object.keys(keyValue)[0] : 'field';
    return sendError(res, 409, 'DUPLICATE_KEY', `${duplicateField} already exists`);
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled server error');

  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}
