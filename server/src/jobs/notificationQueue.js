"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationQueue = getNotificationQueue;
exports.enqueueNotificationDelivery = enqueueNotificationDelivery;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
let notificationQueue = null;
function getNotificationQueue() {
    if (env_1.env.NODE_ENV === 'test' || !process.env.ENABLE_BULLMQ) {
        return null;
    }
    if (!notificationQueue) {
        try {
            const redisUrl = new URL(env_1.env.REDIS_URL);
            notificationQueue = new bullmq_1.Queue('fitcore-notifications', {
                connection: {
                    host: redisUrl.hostname,
                    port: Number(redisUrl.port) || 6379,
                    password: redisUrl.password || undefined,
                },
            });
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'BullMQ queue initialization skipped; falling back to inline dispatch');
            return null;
        }
    }
    return notificationQueue;
}
async function enqueueNotificationDelivery(payload) {
    const queue = getNotificationQueue();
    if (queue) {
        try {
            await queue.add('deliver-notification', payload, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true,
            });
            return;
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Failed to enqueue BullMQ job; logging inline delivery');
        }
    }
    logger_1.logger.debug({ userId: payload.userId, channels: payload.channels, title: payload.title }, 'Notification recorded for in-app / fallback delivery');
}
