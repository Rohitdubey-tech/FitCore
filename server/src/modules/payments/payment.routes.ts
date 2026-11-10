import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as paymentController from './payment.controller';
import {
  createOrderSchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema,
  refundPaymentSchema,
  verifyPaymentSchema,
} from './payment.schema';

const router = Router();

// Public webhook endpoint authenticated via Razorpay HMAC-SHA256 signature
router.post('/webhook', paymentController.handleWebhook);

router.use(authenticate);

router.post('/orders', validate({ body: createOrderSchema }), paymentController.createOrder);
router.post('/verify', validate({ body: verifyPaymentSchema }), paymentController.verifyPayment);
router.post(
  '/sandbox-complete',
  validate({ body: z.object({ razorpayOrderId: z.string().min(1) }) }),
  paymentController.sandboxComplete
);
router.get(
  '/history',
  validate({ query: listPaymentsQuerySchema }),
  paymentController.listHistory
);
router.post(
  '/:id/refund',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: paymentIdParamSchema, body: refundPaymentSchema }),
  paymentController.refundPayment
);
router.get(
  '/:id/invoice',
  validate({ params: paymentIdParamSchema }),
  paymentController.getInvoice
);

export const paymentRoutes = router;

