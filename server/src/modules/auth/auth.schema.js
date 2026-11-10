"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.logoutSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
exports.registerSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1, 'First name is required').max(80),
    lastName: zod_1.z.string().trim().min(1, 'Last name is required').max(80),
    email: zod_1.z.string().trim().email('Valid email is required').toLowerCase(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    password: passwordSchema,
    role: zod_1.z.enum(['member', 'gym_admin']).default('member'),
    gymName: zod_1.z.string().trim().min(2).max(120).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Valid email is required').toLowerCase(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).optional(),
    allSessions: zod_1.z.boolean().optional().default(false),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Valid email is required').toLowerCase(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Verification token is required'),
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(80).optional(),
    lastName: zod_1.z.string().trim().min(1).max(80).optional(),
    phone: zod_1.z.string().trim().min(7).max(24).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    notificationPreferences: zod_1.z
        .object({
        email: zod_1.z.boolean().optional(),
        push: zod_1.z.boolean().optional(),
        inApp: zod_1.z.boolean().optional(),
    })
        .optional(),
});
