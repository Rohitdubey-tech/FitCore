import { z } from 'zod';
import { GYM_STATUSES } from '@fitcore/shared-types';

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid resource identifier');

export const gymBranchInputSchema = z.object({
  id: objectIdSchema.optional(),
  name: z.string().trim().min(2, 'Branch name is required').max(120),
  address: z.string().trim().min(3, 'Address is required').max(250),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  postalCode: z.string().trim().min(3, 'Postal code is required').max(20),
  phone: z.string().trim().min(7).max(24).optional(),
  isPrimary: z.boolean().default(false),
});

export const operatingHourInputSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  isClosed: z.boolean().default(false),
});

export const createGymSchema = z.object({
  name: z.string().trim().min(2, 'Gym name is required').max(120),
  description: z.string().trim().max(1000).optional(),
  contactEmail: z.string().trim().email('Valid contact email is required').toLowerCase(),
  contactPhone: z.string().trim().min(7, 'Contact phone is required').max(24),
  website: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  timezone: z.string().trim().min(2).max(60).default('Asia/Kolkata'),
  currency: z.string().trim().length(3).toUpperCase().default('INR'),
  operatingHours: z.array(operatingHourInputSchema).max(7).optional(),
  branches: z.array(gymBranchInputSchema).max(50).optional(),
});

export const updateGymSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  contactEmail: z.string().trim().email().toLowerCase().optional(),
  contactPhone: z.string().trim().min(7).max(24).optional(),
  website: z.string().trim().url().optional().or(z.literal('')),
  timezone: z.string().trim().min(2).max(60).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  operatingHours: z.array(operatingHourInputSchema).max(7).optional(),
  branches: z.array(gymBranchInputSchema).max(50).optional(),
  status: z.enum(GYM_STATUSES).optional(),
});

export const listGymsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(GYM_STATUSES).optional(),
});

export const gymIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
export type ListGymsQuery = z.infer<typeof listGymsQuerySchema>;

