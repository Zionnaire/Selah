import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './Configs/env';
import { authenticate } from './Middlewares/auth';
import { errorHandler, notFound } from './Middlewares/error';
import { apiLimiter } from './Middlewares/rateLimit';
import { apiRoutes } from './Routes';
import { healthRoutes } from './Routes/health';
import { logger } from './Utils/logger';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  // A push can carry up to 100 records, so sync gets a larger body limit than everything else.
  // Rate limit and authenticate BEFORE parsing, so an anonymous caller cannot make the server read 6 MB.
  app.use('/api/v1/sync', apiLimiter, authenticate, express.json({ limit: '6mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(healthRoutes);
  app.use('/api/v1', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
