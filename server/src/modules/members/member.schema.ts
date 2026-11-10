import { z } from 'zod';
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  GYM_MEMBER_STATUSES,
} from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const createMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  phone: z.string().trim().min(7).max(24).optional(),
  password: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters')
    .max(128)
    .optional(),
  branchId: objectIdSchema.optional(),
  assignedTrainerId: objectIdSchema.optional(),
  membershipCode: z.string().trim().min(2).max(40).optional(),
  status: z.enum(GYM_MEMBER_STATUSES).default('active'),
  fitnessGoal: z.enum(FITNESS_GOALS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateMemberSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  branchId: objectIdSchema.nullable().optional(),
  assignedTrainerId: objectIdSchema.nullable().optional(),
  status: z.enum(GYM_MEMBER_STATUSES).optional(),
  fitnessGoal: z.enum(FITNESS_GOALS).nullable().optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(GYM_MEMBER_STATUSES).optional(),
  branchId: objectIdSchema.optional(),
  fitnessGoal: z.enum(FITNESS_GOALS).optional(),
  sortBy: z.enum(['joinedAt', 'createdAt', 'membershipCode', 'status']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const memberIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;

