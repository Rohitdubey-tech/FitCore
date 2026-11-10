import mongoose, { Document, Schema, Types } from 'mongoose';
import { ACCOUNT_STATUSES, AccountStatus, USER_ROLES, UserProfileDTO, UserRole } from '@fitcore/shared-types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  gymIds: Types.ObjectId[];
  activeGymId?: Types.ObjectId;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  lastLoginAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toProfileDTO(): UserProfileDTO;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    phone: { type: String, trim: true, maxlength: 24 },
    avatarUrl: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'member',
      required: true,
    },
    status: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'active',
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    gymIds: [{ type: Schema.Types.ObjectId, ref: 'Gym' }],
    activeGymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ gymIds: 1 });
userSchema.index({ isDeleted: 1, email: 1 });

userSchema.methods.toProfileDTO = function toProfileDTO(this: IUser): UserProfileDTO {
  return {
    id: this._id.toString(),
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    role: this.role,
    status: this.status,
    isEmailVerified: this.isEmailVerified,
    gymIds: this.gymIds.map((id) => id.toString()),
    activeGymId: this.activeGymId?.toString(),
    notificationPreferences: {
      email: this.notificationPreferences?.email ?? true,
      push: this.notificationPreferences?.push ?? true,
      inApp: this.notificationPreferences?.inApp ?? true,
    },
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const UserModel = mongoose.model<IUser>('User', userSchema);
