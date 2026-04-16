import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'SELLER_PRO', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_KYC']).optional(),
  kycStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const userIdParamSchema = z.object({ id: z.string().uuid() });
export const listingIdParamSchema = z.object({ id: z.string().uuid() });
export const settingKeyParamSchema = z.object({ key: z.string().min(1).max(100) });

export const reasonBodySchema = z.object({ reason: z.string().min(3).max(500) });
export const rejectionBodySchema = z.object({ rejectionReason: z.string().min(3).max(500) });
export const updateRoleSchema = z.object({ role: z.enum(['BUYER', 'SELLER', 'SELLER_PRO', 'ADMIN']) });
export const updateSettingSchema = z.object({ value: z.string().min(1).max(2000) });

export const listAdminListingsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'PAUSED', 'DELETED']).optional(),
  userId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listPaymentsQuerySchema = z.object({
  type: z.enum(['CONTACT_ACCESS', 'SUBSCRIPTION', 'DEMAND_LISTING', 'EXPRESS_DEMAND']).optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']).optional(),
  method: z.enum(['MOBILE_MONEY', 'CARD']).optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const revenueQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('day'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
