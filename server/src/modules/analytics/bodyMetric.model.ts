import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBodyMetric extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  memberId?: Types.ObjectId;
  recordedAt: Date;
  weightKg: number;
  heightCm?: number;
  bmi?: number;
  bodyFatPercent?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  armCm?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bodyMetricSchema = new Schema<IBodyMetric>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember' },
    recordedAt: { type: Date, required: true, default: Date.now },
    weightKg: { type: Number, required: true, min: 20, max: 400 },
    heightCm: { type: Number, min: 80, max: 260 },
    bmi: { type: Number, min: 8, max: 80 },
    bodyFatPercent: { type: Number, min: 2, max: 70 },
    chestCm: { type: Number, min: 30, max: 250 },
    waistCm: { type: Number, min: 30, max: 250 },
    hipCm: { type: Number, min: 30, max: 250 },
    armCm: { type: Number, min: 15, max: 100 },
    notes: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: 'bodyMetrics',
  }
);

bodyMetricSchema.index({ userId: 1, recordedAt: -1 });
bodyMetricSchema.index({ gymId: 1, userId: 1, recordedAt: -1 });

export const BodyMetricModel = mongoose.model<IBodyMetric>('BodyMetric', bodyMetricSchema);

