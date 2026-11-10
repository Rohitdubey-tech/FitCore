"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainerIdParamSchema = exports.listTrainersQuerySchema = exports.assignMembersSchema = exports.updateTrainerSchema = exports.createTrainerSchema = exports.scheduleSlotSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.scheduleSlotSchema = zod_1.z.object({
    day: zod_1.z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    isAvailable: zod_1.z.boolean().default(true),
});
exports.createTrainerSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1, 'First name is required').max(80),
    lastName: zod_1.z.string().trim().min(1, 'Last name is required').max(80),
    email: zod_1.z.string().trim().email('Valid email is required').toLowerCase(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    password: zod_1.z.string().min(8).max(128).optional(),
    branchId: gym_schema_1.objectIdSchema.optional(),
    specializations: zod_1.z.array(zod_1.z.string().trim().min(1).max(60)).max(20).default([]),
    certifications: zod_1.z.array(zod_1.z.string().trim().min(1).max(100)).max(20).default([]),
    experienceYears: zod_1.z.coerce.number().min(0).max(60).default(1),
    bio: zod_1.z.string().trim().max(1000).optional(),
    hourlyRate: zod_1.z.coerce.number().min(0).optional(),
    schedule: zod_1.z.array(exports.scheduleSlotSchema).max(7).optional(),
    status: zod_1.z.enum(shared_types_1.TRAINER_STATUSES).default('active'),
});
exports.updateTrainerSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    branchId: gym_schema_1.objectIdSchema.nullable().optional(),
    specializations: zod_1.z.array(zod_1.z.string().trim().min(1).max(60)).max(20).optional(),
    certifications: zod_1.z.array(zod_1.z.string().trim().min(1).max(100)).max(20).optional(),
    experienceYears: zod_1.z.coerce.number().min(0).max(60).optional(),
    bio: zod_1.z.string().trim().max(1000).optional(),
    hourlyRate: zod_1.z.coerce.number().min(0).nullable().optional(),
    schedule: zod_1.z.array(exports.scheduleSlotSchema).max(7).optional(),
    status: zod_1.z.enum(shared_types_1.TRAINER_STATUSES).optional(),
});
exports.assignMembersSchema = zod_1.z.object({
    memberIds: zod_1.z.array(gym_schema_1.objectIdSchema).max(200),
});
exports.listTrainersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(shared_types_1.TRAINER_STATUSES).optional(),
});
exports.trainerIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
