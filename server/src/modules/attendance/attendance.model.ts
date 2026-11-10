import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberId: Types.ObjectId;
  userId: Types.ObjectId;
  dateKey: string;
  checkInAt: Date;
  checkOutAt?: Date;
  method: 'qr' | 'manual';
  status: 'checked_in' | 'checked_out';
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: Schema.Types.ObjectId },
    memberId: { type: Schema.Types.ObjectId, ref: 'GymMember', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkInAt: { type: Date, required: true, default: Date.now },
    checkOutAt: { type: Date },
    method: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    status: { type: String, enum: ['checked_in', 'checked_out'], default: 'checked_in' },
  },
  {
    timestamps: true,
    collection: 'attendance',
  }
);

attendanceSchema.index({ gymId: 1, dateKey: 1, memberId: 1 });
attendanceSchema.index({ userId: 1, dateKey: -1 });

export const AttendanceModel = mongoose.model<IAttendance>('Attendance', attendanceSchema);

