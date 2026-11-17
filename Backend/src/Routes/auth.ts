import { Router } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@selah/domain';
import { asyncHandler } from '../Utils/asyncHandler';
import { authenticate } from '../Middlewares/auth';
import { authLimiter, refreshLimiter } from '../Middlewares/rateLimit';
import { validateBody } from '../Middlewares/validate';
import { accountController } from '../Controllers/account';
import { authController } from '../Controllers/auth';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(authController.register));
authRoutes.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRoutes.post('/refresh', refreshLimiter, asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));
authRoutes.get('/me', authenticate, asyncHandler(authController.me));
authRoutes.post('/forgot', authLimiter, validateBody(forgotPasswordSchema), asyncHandler(accountController.forgot));
authRoutes.post('/reset', authLimiter, validateBody(resetPasswordSchema), asyncHandler(accountController.reset));
