import type { Request, Response } from 'express';
import { aiService } from '../Services/ai';

export const aiController = {
  suggest: async (req: Request, res: Response) => {
    res.json(await aiService.suggest(req.userId!, req.body));
  },
};
