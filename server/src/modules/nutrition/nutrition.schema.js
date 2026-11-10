"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foodLogIdParamSchema = exports.dailySummaryQuerySchema = exports.createFoodLogSchema = exports.createDietPlanSchema = exports.searchFoodsQuerySchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.searchFoodsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(120).optional(),
    cuisine: zod_1.z.enum(['indian', 'international']).optional(),
    dietaryTag: zod_1.z.string().trim().max(40).optional(),
    category: zod_1.z.string().trim().max(40).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
});
const mealItemInputSchema = zod_1.z.object({
    foodItemId: gym_schema_1.objectIdSchema.optional(),
    name: zod_1.z.string().trim().min(1).max(140),
    quantityLabel: zod_1.z.string().trim().min(1).max(80).default('1 serving'),
    servings: zod_1.z.coerce.number().positive().default(1),
    calories: zod_1.z.coerce.number().min(0).optional(),
    proteinGrams: zod_1.z.coerce.number().min(0).optional(),
    carbsGrams: zod_1.z.coerce.number().min(0).optional(),
    fatsGrams: zod_1.z.coerce.number().min(0).optional(),
});
exports.createDietPlanSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    memberId: gym_schema_1.objectIdSchema.optional(),
    title: zod_1.z.string().trim().min(2).max(140),
    dietaryPreference: zod_1.z.enum(shared_types_1.DIETARY_PREFERENCES).default('vegetarian'),
    dailyTargets: zod_1.z.object({
        calories: zod_1.z.coerce.number().min(800).max(8000),
        proteinGrams: zod_1.z.coerce.number().min(20).max(500),
        carbsGrams: zod_1.z.coerce.number().min(0).max(1000),
        fatsGrams: zod_1.z.coerce.number().min(10).max(400),
        waterMl: zod_1.z.coerce.number().min(500).max(10000).default(3000),
    }),
    meals: zod_1.z.object({
        breakfast: zod_1.z.array(mealItemInputSchema).default([]),
        lunch: zod_1.z.array(mealItemInputSchema).default([]),
        dinner: zod_1.z.array(mealItemInputSchema).default([]),
        snacks: zod_1.z.array(mealItemInputSchema).default([]),
    }),
});
exports.createFoodLogSchema = zod_1.z.object({
    dateKey: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
        .optional(),
    mealType: zod_1.z.enum([...shared_types_1.MEAL_TYPES, 'water']),
    foodItemId: gym_schema_1.objectIdSchema.optional(),
    foodName: zod_1.z.string().trim().min(1).max(140).optional(),
    servings: zod_1.z.coerce.number().positive().max(20).default(1),
    calories: zod_1.z.coerce.number().min(0).optional(),
    proteinGrams: zod_1.z.coerce.number().min(0).optional(),
    carbsGrams: zod_1.z.coerce.number().min(0).optional(),
    fatsGrams: zod_1.z.coerce.number().min(0).optional(),
    waterMl: zod_1.z.coerce.number().min(0).max(5000).optional(),
});
exports.dailySummaryQuerySchema = zod_1.z.object({
    dateKey: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
        .optional(),
});
exports.foodLogIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
