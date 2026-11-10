"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const gym_schema_1 = require("../gyms/gym.schema");
const notification_model_1 = require("./notification.model");
const notificationService = __importStar(require("./notification.service"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, validate_1.validate)({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await notificationService.listUserNotifications(req.auth, page, limit);
    return (0, response_1.sendSuccess)(res, { notifications: result.notifications, unreadCount: result.unreadCount }, { meta: result.meta });
}));
router.patch('/:id/read', (0, validate_1.validate)({ params: zod_1.z.object({ id: gym_schema_1.objectIdSchema }) }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const notification = await notificationService.markNotificationRead(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { notification }, { message: 'Notification marked as read' });
}));
router.post('/read-all', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await notificationService.markAllNotificationsRead(req.auth);
    return (0, response_1.sendSuccess)(res, result, { message: 'All notifications marked as read' });
}));
router.post('/test-reminder', (0, validate_1.validate)({
    body: zod_1.z.object({
        type: zod_1.z.enum(notification_model_1.NOTIFICATION_TYPES).default('workout_reminder'),
        title: zod_1.z.string().trim().min(2).max(160).default('Time to train!'),
        body: zod_1.z.string().trim().min(2).max(500).default('Your scheduled FITCORE session starts soon.'),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const notification = await notificationService.createAndDispatchNotification({
        userId: req.auth.userId,
        gymId: req.auth.activeGymId,
        type: req.body.type,
        title: req.body.title,
        body: req.body.body,
    });
    return (0, response_1.sendSuccess)(res, { notification }, { statusCode: 201 });
}));
exports.notificationRoutes = router;
