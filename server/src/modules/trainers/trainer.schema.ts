import { z } from 'zod';
import { TRAINER_STATUSES } from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const scheduleSlotSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  isAvailable: z.boolean().default(true),
});

export const createTrainerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  phone: z.string().trim().min(7).max(24).optional(),
  password: z.string().min(8).max(128).optional(),
  branchId: objectIdSchema.optional(),
  specializations: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  certifications: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  experienceYears: z.coerce.number().min(0).max(60).default(1),
  bio: z.string().trim().max(1000).optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  schedule: z.array(scheduleSlotSchema).max(7).optional(),
  status: z.enum(TRAINER_STATUSES).default('active'),
});

export const updateTrainerSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  branchId: objectIdSchema.nullable().optional(),
  specializations: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  certifications: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  bio: z.string().trim().max(1000).optional(),
  hourlyRate: z.coerce.number().min(0).nullable().optional(),
  schedule: z.array(scheduleSlotSchema).max(7).optional(),
  status: z.enum(TRAINER_STATUSES).optional(),
});

export const assignMembersSchema = z.object({
  memberIds: z.array(objectIdSchema).max(200),
});

export const listTrainersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(TRAINER_STATUSES).optional(),
});

export const trainerIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateTrainerInput = z.infer<typeof createTrainerSchema>;
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>;
export type ListTrainersQuery = z.infer<typeof listTrainersQuerySchema>;

