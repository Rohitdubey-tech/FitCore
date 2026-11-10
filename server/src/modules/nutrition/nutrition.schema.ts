import { z } from 'zod';
import { DIETARY_PREFERENCES, MEAL_TYPES } from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const searchFoodsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  cuisine: z.enum(['indian', 'international']).optional(),
  dietaryTag: z.string().trim().max(40).optional(),
  category: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const mealItemInputSchema = z.object({
  foodItemId: objectIdSchema.optional(),
  name: z.string().trim().min(1).max(140),
  quantityLabel: z.string().trim().min(1).max(80).default('1 serving'),
  servings: z.coerce.number().positive().default(1),
  calories: z.coerce.number().min(0).optional(),
  proteinGrams: z.coerce.number().min(0).optional(),
  carbsGrams: z.coerce.number().min(0).optional(),
  fatsGrams: z.coerce.number().min(0).optional(),
});

export const createDietPlanSchema = z.object({
  gymId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
  title: z.string().trim().min(2).max(140),
  dietaryPreference: z.enum(DIETARY_PREFERENCES).default('vegetarian'),
  dailyTargets: z.object({
    calories: z.coerce.number().min(800).max(8000),
    proteinGrams: z.coerce.number().min(20).max(500),
    carbsGrams: z.coerce.number().min(0).max(1000),
    fatsGrams: z.coerce.number().min(10).max(400),
    waterMl: z.coerce.number().min(500).max(10000).default(3000),
  }),
  meals: z.object({
    breakfast: z.array(mealItemInputSchema).default([]),
    lunch: z.array(mealItemInputSchema).default([]),
    dinner: z.array(mealItemInputSchema).default([]),
    snacks: z.array(mealItemInputSchema).default([]),
  }),
});

export const createFoodLogSchema = z.object({
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional(),
  mealType: z.enum([...MEAL_TYPES, 'water']),
  foodItemId: objectIdSchema.optional(),
  foodName: z.string().trim().min(1).max(140).optional(),
  servings: z.coerce.number().positive().max(20).default(1),
  calories: z.coerce.number().min(0).optional(),
  proteinGrams: z.coerce.number().min(0).optional(),
  carbsGrams: z.coerce.number().min(0).optional(),
  fatsGrams: z.coerce.number().min(0).optional(),
  waterMl: z.coerce.number().min(0).max(5000).optional(),
});

export const dailySummaryQuerySchema = z.object({
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional(),
});

export const foodLogIdParamSchema = z.object({
  id: objectIdSchema,
});

export type SearchFoodsQuery = z.infer<typeof searchFoodsQuerySchema>;
export type CreateDietPlanInput = z.infer<typeof createDietPlanSchema>;
export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;

