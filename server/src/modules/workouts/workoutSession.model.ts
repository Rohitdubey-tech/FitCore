import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkoutSessionSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isCompleted: boolean;
  isPersonalRecord: boolean;
}

export interface IWorkoutSessionExercise {
  exerciseId: Types.ObjectId;
  exerciseName: string;
  sets: IWorkoutSessionSet[];
}

export interface IWorkoutSession extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  memberId?: Types.ObjectId;
  workoutPlanId?: Types.ObjectId;
  title: string;
  startedAt: Date;
  completedAt?: Date;
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exercises: IWorkoutSessionExercise[];
  totalVolumeKg: number;
  personalRecordsHit: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSetSchema = new Schema<IWorkoutSessionSet>(
  {
    setNumber: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: true, min: 0, max: 500 },
    weightKg: { type: Number, required: true, min: 0, max: 1500 },
    rpe: { type: Number, min: 1, max: 10 },
    isCompleted: { type: Boolean, default: true },
    isPersonalRecord: { type: Boolean, default: false },
  },
  { _id: false }
);

const sessionExerciseSchema = new Schema<IWorkoutSessionExercise>(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    exerciseName: { type: String, required: true },
    sets: [sessionSetSchema],
  },
  { _id: false }
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember' },
    workoutPlanId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    durationMinutes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'completed',
    },
    exercises: [sessionExerciseSchema],
    totalVolumeKg: { type: Number, default: 0, min: 0 },
    personalRecordsHit: { type: Number, default: 0, min: 0 },
    notes: { type: String, maxlength: 1000 },
  },
  {
    timestamps: true,
    collection: 'workoutSessions',
  }
);

workoutSessionSchema.index({ userId: 1, startedAt: -1 });
workoutSessionSchema.index({ gymId: 1, userId: 1, startedAt: -1 });

export const WorkoutSessionModel = mongoose.model<IWorkoutSession>(
  'WorkoutSession',
  workoutSessionSchema
);

