import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProgressPhoto extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  takenAt: Date;
  angle: 'front' | 'side' | 'back';
  imageUrl: string;
  caption?: string;
  createdAt: Date;
  updatedAt: Date;
}

const progressPhotoSchema = new Schema<IProgressPhoto>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    takenAt: { type: Date, required: true, default: Date.now },
    angle: { type: String, enum: ['front', 'side', 'back'], default: 'front' },
    imageUrl: { type: String, required: true, trim: true },
    caption: { type: String, maxlength: 300 },
  },
  {
    timestamps: true,
    collection: 'progressPhotos',
  }
);

progressPhotoSchema.index({ userId: 1, takenAt: -1 });

export const ProgressPhotoModel = mongoose.model<IProgressPhoto>(
  'ProgressPhoto',
  progressPhotoSchema
);

