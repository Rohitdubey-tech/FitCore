import mongoose, { Document, Schema, Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'membership_expiry',
  'payment_confirmation',
  'workout_reminder',
  'diet_reminder',
  'trainer_message',
  'attendance_confirmation',
  'workout_completion',
  'progress_milestone',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  channels: Array<'in_app' | 'email' | 'push'>;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    channels: [{ type: String, enum: ['in_app', 'email', 'push'] }],
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);

