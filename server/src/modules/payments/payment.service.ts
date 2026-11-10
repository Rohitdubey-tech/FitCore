import crypto from 'crypto';
import mongoose, { FilterQuery } from 'mongoose';
import {
  InvoiceDTO,
  PaymentDTO,
  RevenueSummaryDTO,
} from '@fitcore/shared-types';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { AuthActor } from '../gyms/gym.service';
import { GymMemberModel, IGymMember } from '../members/gymMember.model';
import { IMembershipPlan, MembershipPlanModel } from '../memberships/membershipPlan.model';
import { SubscriptionModel } from '../memberships/subscription.model';
import { IUser } from '../users/user.model';
import { IPayment, PaymentModel } from './payment.model';
import {
  CreateOrderInput,
  ListPaymentsQuery,
  RefundPaymentInput,
  VerifyPaymentInput,
} from './payment.schema';
import { WebhookEventModel } from './webhookEvent.model';

function assertGymAccess(actor: AuthActor, gymId: string): void {
  if (actor.role === 'super_admin') return;
  if (!actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function computeRazorpayCheckoutSignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export function computeRazorpayWebhookSignature(rawBody: Buffer | string): string {
  return crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${ym}-${suffix}`;
}

function toPaymentDTO(
  payment: IPayment,
  plan?: IMembershipPlan | null,
  member?: (IGymMember & { userId?: IUser }) | null
): PaymentDTO {
  return {
    id: payment._id.toString(),
    gymId: payment.gymId.toString(),
    memberId: payment.memberId.toString(),
    userId: payment.userId.toString(),
    planId: payment.planId.toString(),
    subscriptionId: payment.subscriptionId?.toString(),
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    invoiceNumber: payment.invoiceNumber,
    receipt: payment.receipt,
    failureReason: payment.failureReason,
    refundedAmount: payment.refundedAmount,
    refundId: payment.refundId,
    refundReason: payment.refundReason,
    paidAt: payment.paidAt?.toISOString(),
    refundedAt: payment.refundedAt?.toISOString(),
    ...(plan
      ? {
          plan: {
            id: plan._id.toString(),
            name: plan.name,
            durationType: plan.durationType,
          },
        }
      : {}),
    ...(member && member.userId
      ? {
          member: {
            id: member._id.toString(),
            membershipCode: member.membershipCode,
            firstName: member.userId.firstName,
            lastName: member.userId.lastName,
            email: member.userId.email,
          },
        }
      : {}),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

async function activateSubscriptionForPayment(
  payment: IPayment,
  plan: IMembershipPlan,
  member: IGymMember | (Omit<IGymMember, 'userId'> & { userId: IUser; save: () => Promise<unknown> })
): Promise<void> {
  if (payment.subscriptionId) {
    return;
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const resolvedUserId =
    typeof member.userId === 'object' && '_id' in member.userId
      ? member.userId._id
      : member.userId;

  const subscription = await SubscriptionModel.create({
    gymId: payment.gymId,
    memberId: member._id,
    userId: resolvedUserId,
    planId: plan._id,
    status: 'active',
    startDate,
    endDate,
    autoRenew: false,
    renewalCount: 0,
  });

  if (member.status !== 'active') {
    member.status = 'active';
    await member.save();
  }

  payment.subscriptionId = subscription._id;
}

export async function createPaymentOrder(
  actor: AuthActor,
  input: CreateOrderInput
): Promise<{
  payment: PaymentDTO;
  razorpay: {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    mode: 'live' | 'sandbox';
  };
}> {
  assertGymAccess(actor, input.gymId);

  const [plan, member] = await Promise.all([
    MembershipPlanModel.findOne({
      _id: input.planId,
      gymId: input.gymId,
      isDeleted: { $ne: true },
      status: 'active',
    }),
    GymMemberModel.findOne({
      _id: input.memberId,
      gymId: input.gymId,
      isDeleted: { $ne: true },
    }).populate<{ userId: IUser }>('userId'),
  ]);

  if (!plan) {
    throw new NotFoundError('Active membership plan not found in this gym');
  }
  if (!member || !member.userId) {
    throw new NotFoundError('Gym member not found in this gym');
  }

  if (actor.role === 'member' && member.userId._id.toString() !== actor.userId) {
    throw new ForbiddenError('Members can only initiate payments for their own account');
  }

  const amountPaise = Math.round(plan.price * 100);
  const receipt = `rcpt_${crypto.randomBytes(6).toString('hex')}`;
  const isLiveKey = !env.RAZORPAY_KEY_ID.startsWith('rzp_test_fitcore_dev');

  let razorpayOrderId = `order_fc_${crypto.randomBytes(7).toString('hex')}`;
  if (isLiveKey && env.NODE_ENV !== 'test') {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: plan.currency,
        receipt,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      logger.error({ status: resp.status, errText }, 'Razorpay order creation failed');
      throw new BadRequestError('Unable to create Razorpay payment order');
    }
    const orderData = (await resp.json()) as { id: string };
    razorpayOrderId = orderData.id;
  }

  const payment = await PaymentModel.create({
    gymId: plan.gymId,
    memberId: member._id,
    userId: member.userId._id,
    planId: plan._id,
    razorpayOrderId,
    amount: plan.price,
    currency: plan.currency,
    status: 'pending',
    receipt,
  });

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: plan.gymId,
    action: 'PAYMENT_ORDER_CREATED',
    resourceType: 'Payment',
    resourceId: payment._id.toString(),
  });

  return {
    payment: toPaymentDTO(
      payment,
      plan,
      member as unknown as IGymMember & { userId: IUser }
    ),
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: razorpayOrderId,
      amountPaise,
      currency: plan.currency,
      mode: isLiveKey ? 'live' : 'sandbox',
    },
  };
}

export async function verifyPaymentSignature(
  actor: AuthActor,
  input: VerifyPaymentInput
): Promise<PaymentDTO> {
  const payment = await PaymentModel.findOne({ razorpayOrderId: input.razorpayOrderId });
  if (!payment) {
    throw new NotFoundError('Payment order not found');
  }

  assertGymAccess(actor, payment.gymId.toString());

  if (actor.role === 'member' && payment.userId.toString() !== actor.userId) {
    throw new ForbiddenError('Cannot verify another member payment');
  }

  const expectedSignature = computeRazorpayCheckoutSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId
  );

  if (!timingSafeHexEqual(expectedSignature, input.razorpaySignature)) {
    payment.status = 'failed';
    payment.failureReason = 'Invalid Razorpay signature';
    await payment.save();
    throw new BadRequestError('Payment signature verification failed');
  }

  const [plan, member] = await Promise.all([
    MembershipPlanModel.findById(payment.planId),
    GymMemberModel.findById(payment.memberId).populate<{ userId: IUser }>('userId'),
  ]);

  if (!plan || !member) {
    throw new NotFoundError('Linked plan or member not found');
  }

  if (payment.status !== 'paid') {
    payment.status = 'paid';
    payment.razorpayPaymentId = input.razorpayPaymentId;
    payment.razorpaySignature = input.razorpaySignature;
    payment.paymentMethod = input.paymentMethod || 'razorpay_checkout';
    payment.invoiceNumber = payment.invoiceNumber || generateInvoiceNumber();
    payment.paidAt = new Date();
    payment.failureReason = undefined;

    await activateSubscriptionForPayment(payment, plan, member);
    await payment.save();

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(actor.userId),
      actorRole: actor.role,
      gymId: payment.gymId,
      action: 'PAYMENT_VERIFIED',
      resourceType: 'Payment',
      resourceId: payment._id.toString(),
    });
  }

  return toPaymentDTO(
    payment,
    plan,
    member as unknown as IGymMember & { userId: IUser }
  );
}

export async function completeSandboxPayment(
  actor: AuthActor,
  razorpayOrderId: string
): Promise<PaymentDTO> {
  if (env.NODE_ENV === 'production' || !env.RAZORPAY_KEY_ID.startsWith('rzp_test_fitcore_dev')) {
    throw new ForbiddenError('Sandbox payment completion is disabled in production');
  }
  const razorpayPaymentId = `pay_sandbox_${crypto.randomBytes(6).toString('hex')}`;
  const razorpaySignature = computeRazorpayCheckoutSignature(razorpayOrderId, razorpayPaymentId);
  return verifyPaymentSignature(actor, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    paymentMethod: 'sandbox_upi',
  });
}

export async function processRazorpayWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  eventIdHeader: string | undefined,
  body: Record<string, unknown>
): Promise<{ duplicate: boolean; eventType: string }> {
  if (!signatureHeader) {
    throw new UnauthorizedError('Missing Razorpay webhook signature');
  }

  const expectedSig = computeRazorpayWebhookSignature(rawBody);
  if (!timingSafeHexEqual(expectedSig, signatureHeader)) {
    throw new UnauthorizedError('Invalid Razorpay webhook signature');
  }

  const eventType = String(body.event || 'unknown');
  const eventId =
    eventIdHeader ||
    crypto.createHash('sha256').update(rawBody).digest('hex');

  const existing = await WebhookEventModel.findOne({ eventId });
  if (existing) {
    return { duplicate: true, eventType };
  }

  const webhookRecord = await WebhookEventModel.create({
    provider: 'razorpay',
    eventId,
    eventType,
    signatureValid: true,
    processed: false,
    payload: body,
  });

  try {
    const payloadObj = body.payload as
      | {
          payment?: {
            entity?: {
              id?: string;
              order_id?: string;
              method?: string;
              error_description?: string;
            };
          };
          refund?: {
            entity?: {
              id?: string;
              payment_id?: string;
              amount?: number;
            };
          };
        }
      | undefined;

    const paymentEntity = payloadObj?.payment?.entity;

    if (eventType === 'payment.captured' && paymentEntity?.order_id) {
      const payment = await PaymentModel.findOne({
        razorpayOrderId: paymentEntity.order_id,
      });
      if (payment && payment.status !== 'paid') {
        const [plan, member] = await Promise.all([
          MembershipPlanModel.findById(payment.planId),
          GymMemberModel.findById(payment.memberId),
        ]);
        payment.status = 'paid';
        payment.razorpayPaymentId = paymentEntity.id;
        payment.paymentMethod = paymentEntity.method || 'razorpay_webhook';
        payment.invoiceNumber = payment.invoiceNumber || generateInvoiceNumber();
        payment.paidAt = new Date();
        if (plan && member) {
          await activateSubscriptionForPayment(payment, plan, member);
        }
        await payment.save();
      }
    } else if (eventType === 'payment.failed' && paymentEntity?.order_id) {
      const payment = await PaymentModel.findOne({
        razorpayOrderId: paymentEntity.order_id,
      });
      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        payment.failureReason = paymentEntity.error_description || 'Payment failed via webhook';
        await payment.save();
      }
    } else if (eventType === 'refund.processed' && payloadObj?.refund?.entity?.payment_id) {
      const refundEntity = payloadObj.refund.entity;
      const payment = await PaymentModel.findOne({
        razorpayPaymentId: refundEntity.payment_id,
      });
      if (payment) {
        const refundInr = (refundEntity.amount || 0) / 100;
        payment.refundedAmount = Math.min(payment.amount, payment.refundedAmount + refundInr);
        payment.refundId = refundEntity.id;
        payment.refundedAt = new Date();
        payment.status =
          payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
        await payment.save();
      }
    }

    webhookRecord.processed = true;
    webhookRecord.processedAt = new Date();
    await webhookRecord.save();
  } catch (err) {
    webhookRecord.errorMessage = err instanceof Error ? err.message : 'Webhook processing error';
    await webhookRecord.save();
    throw err;
  }

  return { duplicate: false, eventType };
}

export async function listPaymentHistory(
  actor: AuthActor,
  query: ListPaymentsQuery
): Promise<{
  payments: PaymentDTO[];
  summary: RevenueSummaryDTO;
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const filter: FilterQuery<IPayment> = {};

  if (query.gymId) {
    assertGymAccess(actor, query.gymId);
    filter.gymId = new mongoose.Types.ObjectId(query.gymId);
  } else if (actor.role !== 'super_admin') {
    filter.gymId = { $in: actor.gymIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (actor.role === 'member') {
    filter.userId = new mongoose.Types.ObjectId(actor.userId);
  } else if (query.memberId) {
    filter.memberId = new mongoose.Types.ObjectId(query.memberId);
  }

  const summaryFilter = { ...filter };
  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [records, total, summaryAgg] = await Promise.all([
    PaymentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate<{ planId: IMembershipPlan }>('planId')
      .populate<{ memberId: IGymMember & { userId: IUser } }>({
        path: 'memberId',
        populate: { path: 'userId' },
      }),
    PaymentModel.countDocuments(filter),
    PaymentModel.aggregate<{
      _id: string;
      totalAmount: number;
      refundedAmount: number;
      count: number;
    }>([
      { $match: summaryFilter },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          refundedAmount: { $sum: '$refundedAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary: RevenueSummaryDTO = {
    totalCollected: 0,
    pendingAmount: 0,
    refundedAmount: 0,
    paidCount: 0,
    failedCount: 0,
    currency: 'INR',
  };

  for (const row of summaryAgg) {
    if (row._id === 'paid' || row._id === 'partially_refunded') {
      summary.totalCollected += row.totalAmount;
      summary.paidCount += row.count;
      summary.refundedAmount += row.refundedAmount;
    } else if (row._id === 'refunded') {
      summary.refundedAmount += row.refundedAmount;
    } else if (row._id === 'pending') {
      summary.pendingAmount += row.totalAmount;
    } else if (row._id === 'failed') {
      summary.failedCount += row.count;
    }
  }

  return {
    payments: records.map((r) =>
      toPaymentDTO(r as unknown as IPayment, r.planId, r.memberId)
    ),
    summary,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function refundPayment(
  actor: AuthActor,
  paymentId: string,
  input: RefundPaymentInput
): Promise<PaymentDTO> {
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  assertGymAccess(actor, payment.gymId.toString());

  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    throw new BadRequestError('Only paid payments can be refunded');
  }

  const remainingRefundable = payment.amount - payment.refundedAmount;
  const refundAmount = input.amount ?? remainingRefundable;

  if (refundAmount <= 0 || refundAmount > remainingRefundable) {
    throw new BadRequestError(`Refund amount must be between 1 and ${remainingRefundable}`);
  }

  payment.refundedAmount += refundAmount;
  payment.refundId = `rfnd_${crypto.randomBytes(6).toString('hex')}`;
  payment.refundReason = input.reason;
  payment.refundedAt = new Date();
  payment.status =
    payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
  await payment.save();

  if (payment.status === 'refunded' && payment.subscriptionId) {
    await SubscriptionModel.updateOne(
      { _id: payment.subscriptionId },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );
  }

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: payment.gymId,
    action: 'PAYMENT_REFUNDED',
    resourceType: 'Payment',
    resourceId: payment._id.toString(),
    metadata: { refundAmount, reason: input.reason },
  });

  const [plan, member] = await Promise.all([
    MembershipPlanModel.findById(payment.planId),
    GymMemberModel.findById(payment.memberId).populate<{ userId: IUser }>('userId'),
  ]);

  return toPaymentDTO(
    payment,
    plan,
    member as unknown as IGymMember & { userId: IUser }
  );
}

export async function getPaymentInvoice(
  actor: AuthActor,
  paymentId: string
): Promise<InvoiceDTO> {
  const payment = await PaymentModel.findById(paymentId)
    .populate<{ planId: IMembershipPlan }>('planId')
    .populate<{ memberId: IGymMember & { userId: IUser } }>({
      path: 'memberId',
      populate: { path: 'userId' },
    });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  assertGymAccess(actor, payment.gymId.toString());

  if (actor.role === 'member' && payment.userId.toString() !== actor.userId) {
    throw new ForbiddenError('Cannot access another member invoice');
  }

  if (!payment.invoiceNumber) {
    throw new BadRequestError('Invoice is only generated for paid transactions');
  }

  const gym = await GymModel.findById(payment.gymId);
  if (!gym || !payment.planId || !payment.memberId?.userId) {
    throw new NotFoundError('Invoice entities not found');
  }

  return {
    invoiceNumber: payment.invoiceNumber,
    issuedAt: (payment.paidAt || payment.updatedAt).toISOString(),
    status: payment.status,
    gym: {
      name: gym.name,
      contactEmail: gym.contactEmail,
      contactPhone: gym.contactPhone,
    },
    member: {
      name: `${payment.memberId.userId.firstName} ${payment.memberId.userId.lastName}`,
      email: payment.memberId.userId.email,
      membershipCode: payment.memberId.membershipCode,
    },
    plan: {
      name: payment.planId.name,
      durationDays: payment.planId.durationDays,
    },
    amount: payment.amount,
    refundedAmount: payment.refundedAmount,
    currency: payment.currency,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
  };
}
