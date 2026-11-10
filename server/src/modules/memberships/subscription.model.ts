import mongoose, { Document, Schema, Types } from 'mongoose';
import { SUBSCRIPTION_STATUSES, SubscriptionStatus } from '@fitcore/shared-types';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  renewalCount: number;
  suspendedReason?: string;
  cancelledAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: 'active',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: false },
    renewalCount: { type: Number, default: 0, min: 0 },
    suspendedReason: { type: String, maxlength: 500 },
    cancelledAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
  }
);

subscriptionSchema.index({ gymId: 1, status: 1, endDate: 1 });
subscriptionSchema.index({ memberId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, status: 1 });

export const SubscriptionModel = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema
);

