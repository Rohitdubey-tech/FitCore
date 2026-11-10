import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  DIETARY_PREFERENCES,
  DietaryPreference,
  DietPlanMealItemDTO,
} from '@fitcore/shared-types';

export interface IDietPlan extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  memberId?: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  title: string;
  dietaryPreference: DietaryPreference;
  dailyTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  };
  meals: {
    breakfast: DietPlanMealItemDTO[];
    lunch: DietPlanMealItemDTO[];
    dinner: DietPlanMealItemDTO[];
    snacks: DietPlanMealItemDTO[];
  };
  isAIGenerated: boolean;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const mealItemSchema = new Schema<DietPlanMealItemDTO>(
  {
    foodItemId: { type: String },
    name: { type: String, required: true },
    quantityLabel: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    proteinGrams: { type: Number, required: true, min: 0 },
    carbsGrams: { type: Number, required: true, min: 0 },
    fatsGrams: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const dietPlanSchema = new Schema<IDietPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember' },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    dietaryPreference: { type: String, enum: DIETARY_PREFERENCES, default: 'vegetarian' },
    dailyTargets: {
      calories: { type: Number, required: true, min: 800 },
      proteinGrams: { type: Number, required: true, min: 20 },
      carbsGrams: { type: Number, required: true, min: 0 },
      fatsGrams: { type: Number, required: true, min: 10 },
      waterMl: { type: Number, default: 3000, min: 500 },
    },
    meals: {
      breakfast: [mealItemSchema],
      lunch: [mealItemSchema],
      dinner: [mealItemSchema],
      snacks: [mealItemSchema],
    },
    isAIGenerated: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  {
    timestamps: true,
    collection: 'dietPlans',
  }
);

dietPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });
dietPlanSchema.index({ gymId: 1, memberId: 1 });

export const DietPlanModel = mongoose.model<IDietPlan>('DietPlan', dietPlanSchema);

