import mongoose, { Document, Schema, Types } from 'mongoose';
import { PLAN_DURATION_TYPES, PlanDurationType } from '@fitcore/shared-types';

export interface IMembershipPlan extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  name: string;
  description?: string;
  durationType: PlanDurationType;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  includesPersonalTraining: boolean;
  status: 'active' | 'archived';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    durationType: {
      type: String,
      enum: PLAN_DURATION_TYPES,
      required: true,
    },
    durationDays: { type: Number, required: true, min: 1, max: 3650 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    features: [{ type: String, trim: true }],
    includesPersonalTraining: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'membershipPlans',
  }
);

membershipPlanSchema.index({ gymId: 1, status: 1 });

export const MembershipPlanModel = mongoose.model<IMembershipPlan>(
  'MembershipPlan',
  membershipPlanSchema
);

