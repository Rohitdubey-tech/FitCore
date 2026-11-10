"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressPhotoSchema = exports.createBodyMetricSchema = exports.analyticsQuerySchema = void 0;
const zod_1 = require("zod");
const gym_schema_1 = require("../gyms/gym.schema");
exports.analyticsQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    days: zod_1.z.coerce.number().int().min(7).max(365).default(30),
});
exports.createBodyMetricSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    recordedAt: zod_1.z.string().datetime().optional(),
    weightKg: zod_1.z.coerce.number().min(20).max(400),
    heightCm: zod_1.z.coerce.number().min(80).max(260).optional(),
    bodyFatPercent: zod_1.z.coerce.number().min(2).max(70).optional(),
    chestCm: zod_1.z.coerce.number().min(30).max(250).optional(),
    waistCm: zod_1.z.coerce.number().min(30).max(250).optional(),
    hipCm: zod_1.z.coerce.number().min(30).max(250).optional(),
    armCm: zod_1.z.coerce.number().min(15).max(100).optional(),
    notes: zod_1.z.string().trim().max(500).optional(),
});
exports.createProgressPhotoSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    angle: zod_1.z.enum(['front', 'side', 'back']).default('front'),
    imageUrl: zod_1.z.string().trim().url('Valid image URL is required'),
    caption: zod_1.z.string().trim().max(300).optional(),
});
