"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIdParamSchema = exports.listPaymentsQuerySchema = exports.refundPaymentSchema = exports.verifyPaymentSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
const gym_schema_1 = require("../gyms/gym.schema");
exports.createOrderSchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema,
    memberId: gym_schema_1.objectIdSchema,
    planId: gym_schema_1.objectIdSchema,
    autoRenew: zod_1.z.boolean().default(false),
});
exports.verifyPaymentSchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().trim().min(1, 'Order ID is required'),
    razorpayPaymentId: zod_1.z.string().trim().min(1, 'Payment ID is required'),
    razorpaySignature: zod_1.z.string().trim().min(1, 'Signature is required'),
    paymentMethod: zod_1.z.string().trim().max(40).optional(),
});
exports.refundPaymentSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive().optional(),
    reason: zod_1.z.string().trim().min(2).max(500).default('Requested by gym admin'),
});
exports.listPaymentsQuerySchema = zod_1.z.object({
    gymId: gym_schema_1.objectIdSchema.optional(),
    memberId: gym_schema_1.objectIdSchema.optional(),
    status: zod_1.z.enum(shared_types_1.PAYMENT_STATUSES).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.paymentIdParamSchema = zod_1.z.object({
    id: gym_schema_1.objectIdSchema,
});
