import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  _id: Types.ObjectId;
  provider: 'razorpay';
  eventId: string;
  eventType: string;
  signatureValid: boolean;
  processed: boolean;
  processedAt?: Date;
  payload: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ['razorpay'], required: true, default: 'razorpay' },
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    signatureValid: { type: Boolean, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    payload: { type: Schema.Types.Mixed, required: true },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    collection: 'webhookEvents',
  }
);

webhookEventSchema.index({ provider: 1, eventType: 1, createdAt: -1 });

export const WebhookEventModel = mongoose.model<IWebhookEvent>(
  'WebhookEvent',
  webhookEventSchema
);

