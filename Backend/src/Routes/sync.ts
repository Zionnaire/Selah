import { Router } from 'express';
import { pushSchema } from '@selah/domain';
import { syncController } from '../Controllers/sync';
import { validateBody } from '../Middlewares/validate';
import { asyncHandler } from '../Utils/asyncHandler';

export const syncRoutes = Router();

// Authentication runs in app.ts, before the large body is read. The account id comes from the token, never the request.
syncRoutes.post('/push', validateBody(pushSchema), asyncHandler(syncController.push));
syncRoutes.get('/pull', asyncHandler(syncController.pull));
syncRoutes.get('/ids', asyncHandler(syncController.ids));
