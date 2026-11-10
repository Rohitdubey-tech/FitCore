import { z } from 'zod';
import {
  EQUIPMENT_TYPES,
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  MUSCLE_GROUPS,
} from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const listExercisesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT_TYPES).optional(),
  difficulty: z.enum(EXPERIENCE_LEVELS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const createExerciseSchema = z.object({
  gymId: objectIdSchema.optional(),
  name: z.string().trim().min(2).max(120),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).default([]),
  equipment: z.enum(EQUIPMENT_TYPES),
  difficulty: z.enum(EXPERIENCE_LEVELS).default('intermediate'),
  description: z.string().trim().min(5).max(1000),
  instructions: z.array(z.string().trim().min(2)).min(1),
  tips: z.array(z.string().trim().min(2)).default([]),
});

const planExerciseInputSchema = z.object({
  exerciseId: objectIdSchema,
  sets: z.coerce.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(30),
  restSeconds: z.coerce.number().int().min(0).max(600).default(90),
  targetWeightKg: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(300).optional(),
});

const planDayInputSchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(7),
  title: z.string().trim().min(1).max(100),
  exercises: z.array(planExerciseInputSchema).min(1),
});

export const createWorkoutPlanSchema = z.object({
  gymId: objectIdSchema.optional(),
  assignedMemberId: objectIdSchema.optional(),
  name: z.string().trim().min(2, 'Plan name is required').max(120),
  goal: z.enum(FITNESS_GOALS).optional(),
  difficulty: z.enum(EXPERIENCE_LEVELS).default('intermediate'),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  days: z.array(planDayInputSchema).min(1),
});

export const updateWorkoutPlanSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  goal: z.enum(FITNESS_GOALS).optional(),
  difficulty: z.enum(EXPERIENCE_LEVELS).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  days: z.array(planDayInputSchema).min(1).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const listWorkoutsQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  assignedMemberId: objectIdSchema.optional(),
  status: z.enum(['active', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const sessionSetInputSchema = z.object({
  setNumber: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(0).max(500),
  weightKg: z.coerce.number().min(0).max(1500),
  rpe: z.coerce.number().min(1).max(10).optional(),
  isCompleted: z.boolean().default(true),
});

const sessionExerciseInputSchema = z.object({
  exerciseId: objectIdSchema,
  exerciseName: z.string().trim().min(1).max(120),
  sets: z.array(sessionSetInputSchema).min(1),
});

export const createWorkoutSessionSchema = z.object({
  gymId: objectIdSchema.optional(),
  workoutPlanId: objectIdSchema.optional(),
  title: z.string().trim().min(2, 'Workout title is required').max(120),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().min(0).max(600).default(45),
  status: z.enum(['in_progress', 'completed', 'abandoned']).default('completed'),
  exercises: z.array(sessionExerciseInputSchema).default([]),
  notes: z.string().trim().max(1000).optional(),
});

export const updateWorkoutSessionSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  completedAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().min(0).max(600).optional(),
  exercises: z.array(sessionExerciseInputSchema).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listSessionsQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  exerciseId: objectIdSchema.optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const workoutIdParamSchema = z.object({
  id: objectIdSchema,
});

export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
export type UpdateWorkoutSessionInput = z.infer<typeof updateWorkoutSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

