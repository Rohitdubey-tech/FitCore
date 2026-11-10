import { z } from 'zod';
import { PAYMENT_STATUSES } from '@fitcore/shared-types';
import { objectIdSchema } from '../gyms/gym.schema';

export const createOrderSchema = z.object({
  gymId: objectIdSchema,
  memberId: objectIdSchema,
  planId: objectIdSchema,
  autoRenew: z.boolean().default(false),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1, 'Order ID is required'),
  razorpayPaymentId: z.string().trim().min(1, 'Payment ID is required'),
  razorpaySignature: z.string().trim().min(1, 'Signature is required'),
  paymentMethod: z.string().trim().max(40).optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(2).max(500).default('Requested by gym admin'),
});

export const listPaymentsQuerySchema = z.object({
  gymId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paymentIdParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

