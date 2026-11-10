import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ListPaymentsQuery } from './payment.schema';
import * as paymentService from './payment.service';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.createPaymentOrder(req.auth!, req.body);
  return sendSuccess(res, result, { statusCode: 201, message: 'Payment order created' });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.verifyPaymentSignature(req.auth!, req.body);
  return sendSuccess(res, { payment }, { message: 'Payment verified and subscription activated' });
});

export const sandboxComplete = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.completeSandboxPayment(
    req.auth!,
    req.body.razorpayOrderId
  );
  return sendSuccess(res, { payment }, { message: 'Sandbox payment completed and invoice issued' });
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody || JSON.stringify(req.body);
  const signatureHeader = req.get('x-razorpay-signature');
  const eventIdHeader = req.get('x-razorpay-event-id');

  const result = await paymentService.processRazorpayWebhook(
    rawBody,
    signatureHeader,
    eventIdHeader,
    req.body
  );
  return sendSuccess(res, result, { message: 'Webhook processed' });
});

export const listHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.listPaymentHistory(
    req.auth!,
    req.query as unknown as ListPaymentsQuery
  );
  return sendSuccess(
    res,
    { payments: result.payments, summary: result.summary },
    { meta: result.meta }
  );
});

export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.refundPayment(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { payment }, { message: 'Refund processed' });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await paymentService.getPaymentInvoice(req.auth!, req.params.id);
  return sendSuccess(res, { invoice });
});

