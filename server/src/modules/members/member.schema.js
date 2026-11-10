"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberIdParamSchema = exports.listMembersQuerySchema = exports.updateMemberSchema = exports.createMemberSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.createMemberSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1, 'First name is required').max(80),
    lastName: zod_1.z.string().trim().min(1, 'Last name is required').max(80),
    email: zod_1.z.string().trim().email('Valid email is required').toLowerCase(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    password: zod_1.z
        .string()
        .min(8, 'Temporary password must be at least 8 characters')
        .max(128)
        .optional(),
    branchId: gym_schema_1.objectIdSchema.optional(),
    assignedTrainerId: gym_schema_1.objectIdSchema.optional(),
    membershipCode: zod_1.z.string().trim().min(2).max(40).optional(),
    status: zod_1.z.enum(shared_types_1.GYM_MEMBER_STATUSES).default('active'),
    fitnessGoal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).optional(),
    experienceLevel: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).optional(),
    notes: zod_1.z.string().trim().max(1000).optional(),
});
exports.updateMemberSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    branchId: gym_schema_1.objectIdSchema.nullable().optional(),
    assignedTrainerId: gym_schema_1.objectIdSchema.nullable().optional(),
    status: zod_1.z.enum(shared_types_1.GYM_MEMBER_STATUSES).optional(),
    fitnessGoal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).nullable().optional(),
    experienceLevel: zod_1.z.enum(shared_types_1.EXPERIENCE_LEVELS).nullable().optional(),
    notes: zod_1.z.string().trim().max(1000).optional(),
});
exports.listMembersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(shared_types_1.GYM_MEMBER_STATUSES).optional(),
    branchId: gym_schema_1.objectIdSchema.optional(),
    fitnessGoal: zod_1.z.enum(shared_types_1.FITNESS_GOALS).optional(),
    sortBy: zod_1.z.enum(['joinedAt', 'createdAt', 'membershipCode', 'status']).default('joinedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.memberIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
