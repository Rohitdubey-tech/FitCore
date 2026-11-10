import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIRecommendation extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'diet_plan' | 'workout_plan' | 'meal_analysis' | 'progress_insight';
  title: string;
  inputParams: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  safetyDisclosure: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiRecommendationSchema = new Schema<IAIRecommendation>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['diet_plan', 'workout_plan', 'meal_analysis', 'progress_insight'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    inputParams: { type: Schema.Types.Mixed, required: true },
    outputPayload: { type: Schema.Types.Mixed, required: true },
    safetyDisclosure: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'aiRecommendations',
  }
);

aiRecommendationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const AIRecommendationModel = mongoose.model<IAIRecommendation>(
  'AIRecommendation',
  aiRecommendationSchema
);

