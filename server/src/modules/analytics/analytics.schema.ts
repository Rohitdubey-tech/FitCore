import { z } from 'zod';
import { objectIdSchema } from '../gyms/gym.schema';

export const analyticsQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export const createBodyMetricSchema = z.object({
  gymId: objectIdSchema.optional(),
  recordedAt: z.string().datetime().optional(),
  weightKg: z.coerce.number().min(20).max(400),
  heightCm: z.coerce.number().min(80).max(260).optional(),
  bodyFatPercent: z.coerce.number().min(2).max(70).optional(),
  chestCm: z.coerce.number().min(30).max(250).optional(),
  waistCm: z.coerce.number().min(30).max(250).optional(),
  hipCm: z.coerce.number().min(30).max(250).optional(),
  armCm: z.coerce.number().min(15).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createProgressPhotoSchema = z.object({
  gymId: objectIdSchema.optional(),
  angle: z.enum(['front', 'side', 'back']).default('front'),
  imageUrl: z.string().trim().url('Valid image URL is required'),
  caption: z.string().trim().max(300).optional(),
});

export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;
export type CreateProgressPhotoInput = z.infer<typeof createProgressPhotoSchema>;

