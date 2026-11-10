import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversationMessage {
  senderId?: Types.ObjectId;
  role: 'user' | 'assistant' | 'trainer' | 'member';
  content: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  gymId?: Types.ObjectId;
  userId: Types.ObjectId;
  peerUserId?: Types.ObjectId;
  channel: 'ai_assistant' | 'trainer_member';
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IConversationMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['user', 'assistant', 'trainer', 'member'], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    peerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    channel: {
      type: String,
      enum: ['ai_assistant', 'trainer_member'],
      default: 'ai_assistant',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

conversationSchema.index({ userId: 1, channel: 1, updatedAt: -1 });

export const ConversationModel = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);

