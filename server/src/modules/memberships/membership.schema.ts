import { z } from 'zod';
import { PLAN_DURATION_TYPES, SUBSCRIPTION_STATUSES } from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const createPlanSchema = z.object({
  gymId: objectIdSchema,
  name: z.string().trim().min(2, 'Plan name is required').max(120),
  description: z.string().trim().max(1000).optional(),
  durationType: z.enum(PLAN_DURATION_TYPES),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  price: z.coerce.number().min(0),
  currency: z.string().trim().length(3).toUpperCase().default('INR'),
  features: z.array(z.string().trim().min(1).max(120)).max(25).default([]),
  includesPersonalTraining: z.boolean().default(false),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().min(0).optional(),
  features: z.array(z.string().trim().min(1).max(120)).max(25).optional(),
  includesPersonalTraining: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const listPlansQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  durationType: z.enum(PLAN_DURATION_TYPES).optional(),
  status: z.enum(['active', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createSubscriptionSchema = z.object({
  gymId: objectIdSchema,
  memberId: objectIdSchema,
  planId: objectIdSchema,
  startDate: z.string().datetime().optional(),
  autoRenew: z.boolean().default(false),
});

export const updateSubscriptionSchema = z.object({
  action: z.enum(['renew', 'suspend', 'resume', 'cancel', 'expire']).optional(),
  autoRenew: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const resourceIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;

