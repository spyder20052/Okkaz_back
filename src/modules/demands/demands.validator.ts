import { z } from 'zod';

export const initiateDemandSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(5000),
  maxBudget: z.coerce.number().positive().optional(),
  city: z.string().min(2).max(100),
  type: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  propertyValue: z.coerce.number().positive().optional(),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});

export const demandIdParamSchema = z.object({ id: z.string().uuid() });
export const listDemandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
