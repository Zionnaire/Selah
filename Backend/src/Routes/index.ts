import { Router } from 'express';
import { apiLimiter } from '../Middlewares/rateLimit';
import { accountRoutes } from './account';
import { aiRoutes } from './ai';
import { authRoutes } from './auth';
import { syncRoutes } from './sync';

/** Everything under /api/v1. New features register their router here. */
export const apiRoutes = Router();

apiRoutes.use(apiLimiter);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/account', accountRoutes);
apiRoutes.use('/sync', syncRoutes);
apiRoutes.use('/ai', aiRoutes);
