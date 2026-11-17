import { Router } from 'express';
import { deleteAccountSchema, renameDeviceSchema, updateProfileSchema } from '@selah/domain';
import { accountController } from '../Controllers/account';
import { authenticate } from '../Middlewares/auth';
import { authLimiter } from '../Middlewares/rateLimit';
import { validateBody } from '../Middlewares/validate';
import { asyncHandler } from '../Utils/asyncHandler';

export const accountRoutes = Router();

accountRoutes.use(authenticate);
accountRoutes.patch('/profile', validateBody(updateProfileSchema), asyncHandler(accountController.updateProfile));
accountRoutes.get('/sessions', asyncHandler(accountController.sessions));
accountRoutes.patch('/sessions/:id', validateBody(renameDeviceSchema), asyncHandler(accountController.renameDevice));
accountRoutes.delete('/sessions/:id', asyncHandler(accountController.signOutDevice));
// Needs the password again, and shares the tight limit with sign in.
accountRoutes.delete('/', authLimiter, validateBody(deleteAccountSchema), asyncHandler(accountController.deleteAccount));
