import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  EQUIPMENT_TYPES,
  EXPERIENCE_LEVELS,
  EquipmentType,
  ExperienceLevel,
  MUSCLE_GROUPS,
  MuscleGroup,
} from '@fitcore/shared-types';

export interface IExercise extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  name: string;
  slug: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  difficulty: ExperienceLevel;
  description: string;
  instructions: string[];
  tips: string[];
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    muscleGroup: { type: String, enum: MUSCLE_GROUPS, required: true },
    secondaryMuscles: [{ type: String, enum: MUSCLE_GROUPS }],
    equipment: { type: String, enum: EQUIPMENT_TYPES, required: true },
    difficulty: { type: String, enum: EXPERIENCE_LEVELS, default: 'intermediate' },
    description: { type: String, required: true, maxlength: 1000 },
    instructions: [{ type: String, trim: true }],
    tips: [{ type: String, trim: true }],
    isSystem: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'exercises',
  }
);

exerciseSchema.index({ muscleGroup: 1, equipment: 1 });
exerciseSchema.index({ name: 'text', description: 'text' });

export const ExerciseModel = mongoose.model<IExercise>('Exercise', exerciseSchema);

