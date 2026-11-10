import mongoose, { Document, Schema, Types } from 'mongoose';
import { PAYMENT_STATUSES, PaymentStatus } from '@fitcore/shared-types';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  invoiceNumber?: string;
  receipt: string;
  failureReason?: string;
  refundedAmount: number;
  refundId?: string;
  refundReason?: string;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
    paymentMethod: { type: String },
    invoiceNumber: { type: String, unique: true, sparse: true },
    receipt: { type: String, required: true },
    failureReason: { type: String },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundId: { type: String },
    refundReason: { type: String },
    paidAt: { type: Date },
    refundedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

paymentSchema.index({ gymId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ memberId: 1, createdAt: -1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema);

