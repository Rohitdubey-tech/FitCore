import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGymMember extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  userId: Types.ObjectId;
  assignedTrainerId?: Types.ObjectId;
  membershipCode: string;
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  fitnessGoal?: 'fat_loss' | 'muscle_gain' | 'strength' | 'endurance' | 'general_fitness';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  joinedAt: Date;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gymMemberSchema = new Schema<IGymMember>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
    membershipCode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'suspended'],
      default: 'active',
    },
    fitnessGoal: {
      type: String,
      enum: ['fat_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness'],
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    joinedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 1000 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'gymMembers',
  }
);

gymMemberSchema.index({ gymId: 1, userId: 1 }, { unique: true });
gymMemberSchema.index({ gymId: 1, status: 1 });
gymMemberSchema.index({ gymId: 1, assignedTrainerId: 1 });

export const GymMemberModel = mongoose.model<IGymMember>('GymMember', gymMemberSchema);
