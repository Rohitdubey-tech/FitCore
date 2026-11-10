import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  phone: z.string().trim().min(7).max(24).optional(),
  password: passwordSchema,
  role: z.enum(['member', 'gym_admin']).default('member'),
  gymName: z.string().trim().min(2).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  allSessions: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  avatarUrl: z.string().url().optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

