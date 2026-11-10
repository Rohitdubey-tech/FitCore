import { z } from 'zod';
import {
  DIETARY_PREFERENCES,
  EQUIPMENT_TYPES,
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
} from '@fitcore/shared-types';

export const aiDietSchema = z.object({
  age: z.coerce.number().int().min(14).max(90).default(26),
  weightKg: z.coerce.number().min(30).max(300),
  heightCm: z.coerce.number().min(100).max(250),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  fitnessGoal: z.enum(FITNESS_GOALS).default('muscle_gain'),
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .default('moderate'),
  dietaryPreference: z.enum(DIETARY_PREFERENCES).default('vegetarian'),
  cuisine: z.enum(['indian', 'international', 'mixed']).default('indian'),
  allergies: z.array(z.string().trim()).default([]),
  restrictions: z.array(z.string().trim()).default([]),
  budget: z.enum(['budget', 'moderate', 'flexible']).default('moderate'),
  availableIngredients: z.array(z.string().trim()).default([]),
  mealsPerDay: z.coerce.number().int().min(3).max(6).default(4),
  saveAsActivePlan: z.boolean().default(true),
});

export const aiWorkoutSchema = z.object({
  fitnessGoal: z.enum(FITNESS_GOALS).default('muscle_gain'),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).default('intermediate'),
  availableEquipment: z.array(z.enum(EQUIPMENT_TYPES)).default(['barbell', 'dumbbell', 'bodyweight', 'cable']),
  workoutDays: z.coerce.number().int().min(1).max(7).default(4),
  workoutDurationMinutes: z.coerce.number().int().min(20).max(180).default(50),
  targetMuscleGroups: z.array(z.string().trim()).default([]),
  limitations: z.string().trim().max(500).optional(),
  savePlan: z.boolean().default(true),
});

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1500),
});

export const aiMealAnalyzeSchema = z.object({
  description: z.string().trim().max(1000).default(''),
  imageBase64: z.string().max(2_000_000).optional(),
});

export type AIDietInput = z.infer<typeof aiDietSchema>;
export type AIWorkoutInput = z.infer<typeof aiWorkoutSchema>;
export type AIChatInput = z.infer<typeof aiChatSchema>;
export type AIMealAnalyzeInput = z.infer<typeof aiMealAnalyzeSchema>;

