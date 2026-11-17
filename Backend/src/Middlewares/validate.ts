import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../Utils/errors';

/** Validates and replaces req.body with the parsed value, so handlers see clean data. */
export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new AppError(422, 'validation_failed', 'Some details need attention', fields));
    }
    req.body = result.data;
    next();
  };
