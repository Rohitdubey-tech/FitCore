"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiMealAnalyzeSchema = exports.aiChatSchema = exports.aiWorkoutSchema = exports.aiDietSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
exports.aiDietSchema = zod_1.z.object({
    age: zod_1.z.coerce.number().int().min(14).max(90).default(26),
    weightKg: zod_1.z.coerce.number().min(30).max(300),
    heightCm: zod_1.z.coerce.number().min(100).max(250),
    gender: zod_1.z.enum(['male', 'female', 'other']).default('male'),
    fitnessGoal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).default('muscle_gain'),
    activityLevel: zod_1.z
        .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
        .default('moderate'),
    dietaryPreference: zod_1.z.enum(shared_types_1.DIETARY_PREFERENCES).default('vegetarian'),
    cuisine: zod_1.z.enum(['indian', 'international', 'mixed']).default('indian'),
    allergies: zod_1.z.array(zod_1.z.string().trim()).default([]),
    restrictions: zod_1.z.array(zod_1.z.string().trim()).default([]),
    budget: zod_1.z.enum(['budget', 'moderate', 'flexible']).default('moderate'),
    availableIngredients: zod_1.z.array(zod_1.z.string().trim()).default([]),
    mealsPerDay: zod_1.z.coerce.number().int().min(3).max(6).default(4),
    saveAsActivePlan: zod_1.z.boolean().default(true),
});
exports.aiWorkoutSchema = zod_1.z.object({
    fitnessGoal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).default('muscle_gain'),
    experienceLevel: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).default('intermediate'),
    availableEquipment: zod_1.z.array(zod_1.z.enum(shared_types_1.EQUIPMENT_TYPES)).default(['barbell', 'dumbbell', 'bodyweight', 'cable']),
    workoutDays: zod_1.z.coerce.number().int().min(1).max(7).default(4),
    workoutDurationMinutes: zod_1.z.coerce.number().int().min(20).max(180).default(50),
    targetMuscleGroups: zod_1.z.array(zod_1.z.string().trim()).default([]),
    limitations: zod_1.z.string().trim().max(500).optional(),
    savePlan: zod_1.z.boolean().default(true),
});
exports.aiChatSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(1, 'Message is required').max(1500),
});
exports.aiMealAnalyzeSchema = zod_1.z.object({
    description: zod_1.z.string().trim().max(1000).default(''),
    imageBase64: zod_1.z.string().max(2_000_000).optional(),
});
