import mongoose, { Document, Schema, Types } from 'mongoose';
import { TRAINER_STATUSES, TrainerScheduleSlotDTO, TrainerStatus } from '@fitcore/shared-types';

export interface ITrainer extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  userId: Types.ObjectId;
  specializations: string[];
  certifications: string[];
  experienceYears: number;
  bio?: string;
  hourlyRate?: number;
  schedule: TrainerScheduleSlotDTO[];
  status: TrainerStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSlotSchema = new Schema<TrainerScheduleSlotDTO>(
  {
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const trainerSchema = new Schema<ITrainer>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    specializations: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 1 },
    bio: { type: String, maxlength: 1000 },
    hourlyRate: { type: Number, min: 0 },
    schedule: [scheduleSlotSchema],
    status: {
      type: String,
      enum: TRAINER_STATUSES,
      default: 'active',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'trainers',
  }
);

trainerSchema.index({ gymId: 1, userId: 1 }, { unique: true });
trainerSchema.index({ gymId: 1, status: 1 });

export const TrainerModel = mongoose.model<ITrainer>('Trainer', trainerSchema);

