import type { Request, Response } from 'express';
import { databaseReady } from '../Configs/db';

export const healthController = {
  /** Liveness: the process is up. */
  live: (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  },

  /** Readiness: dependencies are reachable. Orchestrators use this to route traffic. */
  ready: (_req: Request, res: Response) => {
    const db = databaseReady();
    res.status(db ? 200 : 503).json({ status: db ? 'ready' : 'degraded', database: db ? 'up' : 'down' });
  },
};
