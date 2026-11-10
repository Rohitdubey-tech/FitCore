import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGymBranch {
  _id: Types.ObjectId;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  isPrimary: boolean;
}

export interface IGym extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  timezone: string;
  currency: string;
  operatingHours: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  branches: IGymBranch[];
  status: 'active' | 'suspended' | 'pending';
  subscriptionTier: 'starter' | 'growth' | 'enterprise';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IGymBranch>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const gymSchema = new Schema<IGym>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 1000 },
    logoUrl: { type: String },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    operatingHours: [
      {
        day: { type: String, required: true },
        open: { type: String, required: true },
        close: { type: String, required: true },
        isClosed: { type: Boolean, default: false },
      },
    ],
    branches: [branchSchema],
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    subscriptionTier: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      default: 'starter',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'gyms',
  }
);

gymSchema.index({ ownerId: 1 });
gymSchema.index({ status: 1, isDeleted: 1 });

export const GymModel = mongoose.model<IGym>('Gym', gymSchema);
