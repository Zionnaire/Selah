import type { Request, Response } from 'express';
import { pullQuerySchema } from '@selah/domain';
import { syncService } from '../Services/sync';
import { AppError } from '../Utils/errors';

export const syncController = {
  push: async (req: Request, res: Response) => {
    res.json(await syncService.push(req.userId!, req.body));
  },

  pull: async (req: Request, res: Response) => {
    const q = pullQuerySchema.safeParse(req.query);
    if (!q.success) throw AppError.badRequest('since and limit must be whole numbers');
    res.json(await syncService.pull(req.userId!, q.data.since, q.data.limit, q.data.full === '1'));
  },

  ids: async (req: Request, res: Response) => {
    res.json({ records: await syncService.allIds(req.userId!) });
  },
};
