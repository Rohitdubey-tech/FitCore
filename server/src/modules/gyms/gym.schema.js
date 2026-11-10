"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gymIdParamSchema = exports.listGymsQuerySchema = exports.updateGymSchema = exports.createGymSchema = exports.operatingHourInputSchema = exports.gymBranchInputSchema = exports.objectIdSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@fitcore/shared-types");
exports.objectIdSchema = zod_1.z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid resource identifier');
exports.gymBranchInputSchema = zod_1.z.object({
    id: exports.objectIdSchema.optional(),
    name: zod_1.z.string().trim().min(2, 'Branch name is required').max(120),
    address: zod_1.z.string().trim().min(3, 'Address is required').max(250),
    city: zod_1.z.string().trim().min(2, 'City is required').max(100),
    state: zod_1.z.string().trim().min(2, 'State is required').max(100),
    postalCode: zod_1.z.string().trim().min(3, 'Postal code is required').max(20),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    isPrimary: zod_1.z.boolean().default(false),
});
exports.operatingHourInputSchema = zod_1.z.object({
    day: zod_1.z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    open: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    close: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    isClosed: zod_1.z.boolean().default(false),
});
exports.createGymSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Gym name is required').max(120),
    description: zod_1.z.string().trim().max(1000).optional(),
    contactEmail: zod_1.z.string().trim().email('Valid contact email is required').toLowerCase(),
    contactPhone: zod_1.z.string().trim().min(7, 'Contact phone is required').max(24),
    website: zod_1.z.string().trim().url('Enter a valid URL').optional().or(zod_1.z.literal('')),
    timezone: zod_1.z.string().trim().min(2).max(60).default('Asia/Kolkata'),
    currency: zod_1.z.string().trim().length(3).toUpperCase().default('INR'),
    operatingHours: zod_1.z.array(exports.operatingHourInputSchema).max(7).optional(),
    branches: zod_1.z.array(exports.gymBranchInputSchema).max(50).optional(),
});
exports.updateGymSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).optional(),
    description: zod_1.z.string().trim().max(1000).optional(),
    contactEmail: zod_1.z.string().trim().email().toLowerCase().optional(),
    contactPhone: zod_1.z.string().trim().min(7).max(24).optional(),
    website: zod_1.z.string().trim().url().optional().or(zod_1.z.literal('')),
    timezone: zod_1.z.string().trim().min(2).max(60).optional(),
    currency: zod_1.z.string().trim().length(3).toUpperCase().optional(),
    operatingHours: zod_1.z.array(exports.operatingHourInputSchema).max(7).optional(),
    branches: zod_1.z.array(exports.gymBranchInputSchema).max(50).optional(),
    status: zod_1.z.enum(shared_types_1.GYM_STATUSES).optional(),
});
exports.listGymsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(shared_types_1.GYM_STATUSES).optional(),
});
exports.gymIdParamSchema = zod_1.z.object({
    id: exports.objectIdSchema,
});
