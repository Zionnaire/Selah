import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../Utils/errors';
import { logger } from '../Utils/logger';

export const notFound: RequestHandler = (_req, _res, next) => next(AppError.notFound('Route not found'));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_json', message: 'Request body is not valid JSON' } });
    return;
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side' } });
};
