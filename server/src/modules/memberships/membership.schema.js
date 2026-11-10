"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceIdParamSchema = exports.listSubscriptionsQuerySchema = exports.updateSubscriptionSchema = exports.createSubscriptionSchema = exports.listPlansQuerySchema = exports.updatePlanSchema = exports.createPlanSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.createPlanSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema,
    name: zod_1.z.string().trim().min(2, 'Plan name is required').max(120),
    description: zod_1.z.string().trim().max(1000).optional(),
    durationType: zod_1.z.enum(shared_types_1.PLAN_DURATION_TYPES),
    durationDays: zod_1.z.coerce.number().int().min(1).max(3650).optional(),
    price: zod_1.z.coerce.number().min(0),
    currency: zod_1.z.string().trim().length(3).toUpperCase().default('INR'),
    features: zod_1.z.array(zod_1.z.string().trim().min(1).max(120)).max(25).default([]),
    includesPersonalTraining: zod_1.z.boolean().default(false),
});
exports.updatePlanSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).optional(),
    description: zod_1.z.string().trim().max(1000).optional(),
    price: zod_1.z.coerce.number().min(0).optional(),
    features: zod_1.z.array(zod_1.z.string().trim().min(1).max(120)).max(25).optional(),
    includesPersonalTraining: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
});
exports.listPlansQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    durationType: zod_1.z.enum(shared_types_1.PLAN_DURATION_TYPES).optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.createSubscriptionSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema,
    memberId: gym_schema_1.objectIdSchema,
    planId: gym_schema_1.objectIdSchema,
    startDate: zod_1.z.string().datetime().optional(),
    autoRenew: zod_1.z.boolean().default(false),
});
exports.updateSubscriptionSchema = zod_1.z.object({
    action: zod_1.z.enum(['renew', 'suspend', 'resume', 'cancel', 'expire']).optional(),
    autoRenew: zod_1.z.boolean().optional(),
    reason: zod_1.z.string().trim().max(500).optional(),
});
exports.listSubscriptionsQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    memberId: gym_schema_1.objectIdSchema.optional(),
    status: zod_1.z.enum(shared_types_1.SUBSCRIPTION_STATUSES).optional(),
    expiringWithinDays: zod_1.z.coerce.number().int().min(1).max(365).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.resourceIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
