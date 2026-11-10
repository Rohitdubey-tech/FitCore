import mongoose from 'mongoose';
import { enqueueNotificationDelivery } from '../../jobs/notificationQueue';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuthActor } from '../gyms/gym.service';
import { UserModel } from '../users/user.model';
import { INotification, NotificationModel, NotificationType } from './notification.model';

function toNotificationDTO(n: INotification) {
  return {
    id: n._id.toString(),
    gymId: n.gymId?.toString(),
    userId: n.userId.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    channels: n.channels,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString(),
    metadata: n.metadata,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function createAndDispatchNotification(params: {
  userId: string;
  gymId?: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const user = await UserModel.findById(params.userId).select('notificationPreferences');
  const prefs = user?.notificationPreferences ?? { email: true, push: true, inApp: true };

  const channels: Array<'in_app' | 'email' | 'push'> = [];
  if (prefs.inApp) channels.push('in_app');
  if (prefs.email) channels.push('email');
  if (prefs.push) channels.push('push');
  if (channels.length === 0) channels.push('in_app');

  const notification = await NotificationModel.create({
    userId: new mongoose.Types.ObjectId(params.userId),
    gymId: params.gymId ? new mongoose.Types.ObjectId(params.gymId) : undefined,
    type: params.type,
    title: params.title,
    body: params.body,
    channels,
    isRead: false,
    metadata: params.metadata,
  });

  await enqueueNotificationDelivery({
    notificationId: notification._id.toString(),
    userId: params.userId,
    channels,
    title: params.title,
    body: params.body,
  });

  return toNotificationDTO(notification);
}

export async function listUserNotifications(
  actor: AuthActor,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const userId = new mongoose.Types.ObjectId(actor.userId);

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationModel.countDocuments({ userId }),
    NotificationModel.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications: items.map(toNotificationDTO),
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function markNotificationRead(actor: AuthActor, notificationId: string) {
  const notification = await NotificationModel.findById(notificationId);
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }
  if (notification.userId.toString() !== actor.userId && actor.role !== 'super_admin') {
    throw new ForbiddenError('Cannot modify another user notification');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return toNotificationDTO(notification);
}

export async function markAllNotificationsRead(actor: AuthActor) {
  await NotificationModel.updateMany(
    { userId: new mongoose.Types.ObjectId(actor.userId), isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { markedAllRead: true };
}

