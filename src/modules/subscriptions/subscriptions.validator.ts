import { z } from 'zod';

export const subscribeSchema = z.object({
  plan: z.enum(['WEEKLY', 'MONTHLY']),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});
