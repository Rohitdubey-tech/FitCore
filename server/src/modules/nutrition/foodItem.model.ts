import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFoodItem extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  category: string;
  cuisine: 'indian' | 'international';
  dietaryTags: string[];
  servingSizeGrams: number;
  servingLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams: number;
  isVerified: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    cuisine: { type: String, enum: ['indian', 'international'], required: true },
    dietaryTags: [{ type: String, trim: true }],
    servingSizeGrams: { type: Number, required: true, min: 1 },
    servingLabel: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    proteinGrams: { type: Number, required: true, min: 0 },
    carbsGrams: { type: Number, required: true, min: 0 },
    fatsGrams: { type: Number, required: true, min: 0 },
    fiberGrams: { type: Number, default: 0, min: 0 },
    isVerified: { type: Boolean, default: true },
    source: { type: String, default: 'IFCT_USDA_VERIFIED' },
  },
  {
    timestamps: true,
    collection: 'foodItems',
  }
);

foodItemSchema.index({ name: 'text' });
foodItemSchema.index({ cuisine: 1, category: 1 });
foodItemSchema.index({ dietaryTags: 1 });

export const FoodItemModel = mongoose.model<IFoodItem>('FoodItem', foodItemSchema);

