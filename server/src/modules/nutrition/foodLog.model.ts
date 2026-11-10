import mongoose, { Document, Schema, Types } from 'mongoose';
import { MEAL_TYPES, MealType } from '@fitcore/shared-types';

export interface IFoodLog extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  dateKey: string;
  mealType: MealType | 'water';
  foodItemId?: Types.ObjectId;
  foodName: string;
  servings: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const foodLogSchema = new Schema<IFoodLog>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mealType: { type: String, enum: [...MEAL_TYPES, 'water'], required: true },
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
    foodName: { type: String, required: true, trim: true, maxlength: 140 },
    servings: { type: Number, default: 1, min: 0 },
    calories: { type: Number, default: 0, min: 0 },
    proteinGrams: { type: Number, default: 0, min: 0 },
    carbsGrams: { type: Number, default: 0, min: 0 },
    fatsGrams: { type: Number, default: 0, min: 0 },
    waterMl: { type: Number, default: 0, min: 0 },
    loggedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'foodLogs',
  }
);

foodLogSchema.index({ userId: 1, dateKey: 1, mealType: 1 });

export const FoodLogModel = mongoose.model<IFoodLog>('FoodLog', foodLogSchema);

