import { z } from 'zod';

export const createReviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const listingIdParamSchema = z.object({ listing_id: z.string().uuid() });
export const reviewIdParamSchema = z.object({ id: z.string().uuid() });
