"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workoutIdParamSchema = exports.listSessionsQuerySchema = exports.updateWorkoutSessionSchema = exports.createWorkoutSessionSchema = exports.listWorkoutsQuerySchema = exports.updateWorkoutPlanSchema = exports.createWorkoutPlanSchema = exports.createExerciseSchema = exports.listExercisesQuerySchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.listExercisesQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(120).optional(),
    muscleGroup: zod_1.z.enum(shared_types_1.MUSCLE_GROUPS).optional(),
    equipment: zod_1.z.enum(shared_types_1.EQUIPMENT_TYPES).optional(),
    difficulty: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
});
exports.createExerciseSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    name: zod_1.z.string().trim().min(2).max(120),
    muscleGroup: zod_1.z.enum(shared_types_1.MUSCLE_GROUPS),
    secondaryMuscles: zod_1.z.array(zod_1.z.enum(shared_types_1.MUSCLE_GROUPS)).default([]),
    equipment: zod_1.z.enum(shared_types_1.EQUIPMENT_TYPES),
    difficulty: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).default('intermediate'),
    description: zod_1.z.string().trim().min(5).max(1000),
    instructions: zod_1.z.array(zod_1.z.string().trim().min(2)).min(1),
    tips: zod_1.z.array(zod_1.z.string().trim().min(2)).default([]),
});
const planExerciseInputSchema = zod_1.z.object({
    exerciseId: gym_schema_1.objectIdSchema,
    sets: zod_1.z.coerce.number().int().min(1).max(20),
    reps: zod_1.z.string().trim().min(1).max(30),
    restSeconds: zod_1.z.coerce.number().int().min(0).max(600).default(90),
    targetWeightKg: zod_1.z.coerce.number().min(0).optional(),
    notes: zod_1.z.string().trim().max(300).optional(),
});
const planDayInputSchema = zod_1.z.object({
    dayNumber: zod_1.z.coerce.number().int().min(1).max(7),
    title: zod_1.z.string().trim().min(1).max(100),
    exercises: zod_1.z.array(planExerciseInputSchema).min(1),
});
exports.createWorkoutPlanSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    assignedMemberId: gym_schema_1.objectIdSchema.optional(),
    name: zod_1.z.string().trim().min(2, 'Plan name is required').max(120),
    goal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).optional(),
    difficulty: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).default('intermediate'),
    daysPerWeek: zod_1.z.coerce.number().int().min(1).max(7),
    days: zod_1.z.array(planDayInputSchema).min(1),
});
exports.updateWorkoutPlanSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).optional(),
    goal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).optional(),
    difficulty: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).optional(),
    daysPerWeek: zod_1.z.coerce.number().int().min(1).max(7).optional(),
    days: zod_1.z.array(planDayInputSchema).min(1).optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
});
exports.listWorkoutsQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    assignedMemberId: gym_schema_1.objectIdSchema.optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const sessionSetInputSchema = zod_1.z.object({
    setNumber: zod_1.z.coerce.number().int().min(1),
    reps: zod_1.z.coerce.number().int().min(0).max(500),
    weightKg: zod_1.z.coerce.number().min(0).max(1500),
    rpe: zod_1.z.coerce.number().min(1).max(10).optional(),
    isCompleted: zod_1.z.boolean().default(true),
});
const sessionExerciseInputSchema = zod_1.z.object({
    exerciseId: gym_schema_1.objectIdSchema,
    exerciseName: zod_1.z.string().trim().min(1).max(120),
    sets: zod_1.z.array(sessionSetInputSchema).min(1),
});
exports.createWorkoutSessionSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    workoutPlanId: gym_schema_1.objectIdSchema.optional(),
    title: zod_1.z.string().trim().min(2, 'Workout title is required').max(120),
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    durationMinutes: zod_1.z.coerce.number().min(0).max(600).default(45),
    status: zod_1.z.enum(['in_progress', 'completed', 'abandoned']).default('completed'),
    exercises: zod_1.z.array(sessionExerciseInputSchema).default([]),
    notes: zod_1.z.string().trim().max(1000).optional(),
});
exports.updateWorkoutSessionSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2).max(120).optional(),
    status: zod_1.z.enum(['in_progress', 'completed', 'abandoned']).optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    durationMinutes: zod_1.z.coerce.number().min(0).max(600).optional(),
    exercises: zod_1.z.array(sessionExerciseInputSchema).optional(),
    notes: zod_1.z.string().trim().max(1000).optional(),
});
exports.listSessionsQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    exerciseId: gym_schema_1.objectIdSchema.optional(),
    status: zod_1.z.enum(['in_progress', 'completed', 'abandoned']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.workoutIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
