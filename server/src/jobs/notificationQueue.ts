import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  channels: Array<'in_app' | 'email' | 'push'>;
  title: string;
  body: string;
}

let notificationQueue: Queue<NotificationJobPayload> | null = null;

export function getNotificationQueue(): Queue<NotificationJobPayload> | null {
  if (env.NODE_ENV === 'test' || !process.env.ENABLE_BULLMQ) {
    return null;
  }

  if (!notificationQueue) {
    try {
      const redisUrl = new URL(env.REDIS_URL);
      notificationQueue = new Queue<NotificationJobPayload>('fitcore-notifications', {
        connection: {
          host: redisUrl.hostname,
          port: Number(redisUrl.port) || 6379,
          password: redisUrl.password || undefined,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'BullMQ queue initialization skipped; falling back to inline dispatch');
      return null;
    }
  }

  return notificationQueue;
}

export async function enqueueNotificationDelivery(payload: NotificationJobPayload): Promise<void> {
  const queue = getNotificationQueue();
  if (queue) {
    try {
      await queue.add('deliver-notification', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      return;
    } catch (err) {
      logger.warn({ err }, 'Failed to enqueue BullMQ job; logging inline delivery');
    }
  }

  logger.debug(
    { userId: payload.userId, channels: payload.channels, title: payload.title },
    'Notification recorded for in-app / fallback delivery'
  );
}

