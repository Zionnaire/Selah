import { Router } from 'express';
import { healthController } from '../Controllers/health';

export const healthRoutes = Router();

healthRoutes.get('/health', healthController.live);
healthRoutes.get('/ready', healthController.ready);
