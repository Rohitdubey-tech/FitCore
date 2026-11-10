import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  jti: string;
  familyId: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true, unique: true },
    familyId: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String },
  },
  {
    timestamps: true,
    collection: 'refreshTokens',
  }
);

refreshTokenSchema.index({ userId: 1, revokedAt: 1 });
refreshTokenSchema.index({ familyId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
