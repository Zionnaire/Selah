import { Router } from 'express';
import { suggestRequestSchema } from '@selah/domain';
import { aiController } from '../Controllers/ai';
import { authenticate } from '../Middlewares/auth';
import { aiLimiter } from '../Middlewares/rateLimit';
import { validateBody } from '../Middlewares/validate';
import { asyncHandler } from '../Utils/asyncHandler';

export const aiRoutes = Router();

aiRoutes.use(authenticate);
aiRoutes.post('/suggest', aiLimiter, validateBody(suggestRequestSchema), asyncHandler(aiController.suggest));
