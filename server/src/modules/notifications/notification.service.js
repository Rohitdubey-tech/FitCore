"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndDispatchNotification = createAndDispatchNotification;
exports.listUserNotifications = listUserNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
const mongoose_1 = __importDefault(require("mongoose"));
const notificationQueue_1 = require("../../jobs/notificationQueue");
const errors_1 = require("../../utils/errors");
const user_model_1 = require("../users/user.model");
const notification_model_1 = require("./notification.model");
function toNotificationDTO(n) {
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
async function createAndDispatchNotification(params) {
    const user = await user_model_1.UserModel.findById(params.userId).select('notificationPreferences');
    const prefs = user?.notificationPreferences ?? { email: true, push: true, inApp: true };
    const channels = [];
    if (prefs.inApp)
        channels.push('in_app');
    if (prefs.email)
        channels.push('email');
    if (prefs.push)
        channels.push('push');
    if (channels.length === 0)
        channels.push('in_app');
    const notification = await notification_model_1.NotificationModel.create({
        userId: new mongoose_1.default.Types.ObjectId(params.userId),
        gymId: params.gymId ? new mongoose_1.default.Types.ObjectId(params.gymId) : undefined,
        type: params.type,
        title: params.title,
        body: params.body,
        channels,
        isRead: false,
        metadata: params.metadata,
    });
    await (0, notificationQueue_1.enqueueNotificationDelivery)({
        notificationId: notification._id.toString(),
        userId: params.userId,
        channels,
        title: params.title,
        body: params.body,
    });
    return toNotificationDTO(notification);
}
async function listUserNotifications(actor, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const userId = new mongoose_1.default.Types.ObjectId(actor.userId);
    const [items, total, unreadCount] = await Promise.all([
        notification_model_1.NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        notification_model_1.NotificationModel.countDocuments({ userId }),
        notification_model_1.NotificationModel.countDocuments({ userId, isRead: false }),
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
async function markNotificationRead(actor, notificationId) {
    const notification = await notification_model_1.NotificationModel.findById(notificationId);
    if (!notification) {
        throw new errors_1.NotFoundError('Notification not found');
    }
    if (notification.userId.toString() !== actor.userId && actor.role !== 'super_admin') {
        throw new errors_1.ForbiddenError('Cannot modify another user notification');
    }
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    return toNotificationDTO(notification);
}
async function markAllNotificationsRead(actor) {
    await notification_model_1.NotificationModel.updateMany({ userId: new mongoose_1.default.Types.ObjectId(actor.userId), isRead: false }, { $set: { isRead: true, readAt: new Date() } });
    return { markedAllRead: true };
}
