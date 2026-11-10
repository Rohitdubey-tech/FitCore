import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  FITNESS_GOALS,
  FitnessGoal,
} from '@fitcore/shared-types';

export interface IWorkoutPlanExercise {
  exerciseId: Types.ObjectId;
  sets: number;
  reps: string;
  restSeconds: number;
  targetWeightKg?: number;
  notes?: string;
}

export interface IWorkoutPlanDay {
  dayNumber: number;
  title: string;
  exercises: IWorkoutPlanExercise[];
}

export interface IWorkoutPlan extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  assignedMemberId?: Types.ObjectId;
  name: string;
  goal?: FitnessGoal;
  difficulty: ExperienceLevel;
  daysPerWeek: number;
  days: IWorkoutPlanDay[];
  status: 'active' | 'archived';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const planExerciseSchema = new Schema<IWorkoutPlanExercise>(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    sets: { type: Number, required: true, min: 1, max: 20 },
    reps: { type: String, required: true, trim: true },
    restSeconds: { type: Number, default: 90, min: 0, max: 600 },
    targetWeightKg: { type: Number, min: 0 },
    notes: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const planDaySchema = new Schema<IWorkoutPlanDay>(
  {
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    exercises: [planExerciseSchema],
  },
  { _id: false }
);

const workoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedMemberId: { type: Schema.Types.ObjectId, ref: 'GymMember' },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    goal: { type: String, enum: FITNESS_GOALS },
    difficulty: { type: String, enum: EXPERIENCE_LEVELS, default: 'intermediate' },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    days: [planDaySchema],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'workoutPlans',
  }
);

workoutPlanSchema.index({ gymId: 1, assignedMemberId: 1, status: 1 });
workoutPlanSchema.index({ createdByUserId: 1, status: 1 });

export const WorkoutPlanModel = mongoose.model<IWorkoutPlan>(
  'WorkoutPlan',
  workoutPlanSchema
);

