"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const conversation_model_1 = require("../ai/conversation.model");
const gym_schema_1 = require("../gyms/gym.schema");
const gymMember_model_1 = require("../members/gymMember.model");
const notification_service_1 = require("../notifications/notification.service");
const trainer_model_1 = require("../trainers/trainer.model");
const user_model_1 = require("../users/user.model");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/contacts', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const actor = req.auth;
    const contactsMap = new Map();
    if (actor.role === 'trainer') {
        const trainer = await trainer_model_1.TrainerModel.findOne({
            userId: actor.userId,
            isDeleted: { $ne: true },
        }).select('_id gymId');
        if (trainer) {
            const assigned = await gymMember_model_1.GymMemberModel.find({
                gymId: trainer.gymId,
                assignedTrainerId: trainer._id,
                isDeleted: { $ne: true },
            }).populate('userId');
            for (const m of assigned) {
                if (m.userId) {
                    contactsMap.set(m.userId._id.toString(), {
                        id: m.userId._id.toString(),
                        firstName: m.userId.firstName,
                        lastName: m.userId.lastName,
                        email: m.userId.email,
                        role: m.userId.role,
                    });
                }
            }
        }
    }
    else if (actor.role === 'member') {
        const memberships = await gymMember_model_1.GymMemberModel.find({
            userId: actor.userId,
            isDeleted: { $ne: true },
            assignedTrainerId: { $exists: true },
        }).select('assignedTrainerId');
        const trainerIds = memberships
            .map((m) => m.assignedTrainerId)
            .filter((id) => Boolean(id));
        if (trainerIds.length > 0) {
            const trainers = await trainer_model_1.TrainerModel.find({ _id: { $in: trainerIds } }).populate('userId');
            for (const t of trainers) {
                if (t.userId) {
                    contactsMap.set(t.userId._id.toString(), {
                        id: t.userId._id.toString(),
                        firstName: t.userId.firstName,
                        lastName: t.userId.lastName,
                        email: t.userId.email,
                        role: t.userId.role,
                    });
                }
            }
        }
    }
    else if (actor.gymIds.length > 0) {
        const gymUsers = await user_model_1.UserModel.find({
            gymIds: { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
            _id: { $ne: new mongoose_1.default.Types.ObjectId(actor.userId) },
            isDeleted: { $ne: true },
        }).limit(50);
        for (const u of gymUsers) {
            contactsMap.set(u._id.toString(), {
                id: u._id.toString(),
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: u.role,
            });
        }
    }
    return (0, response_1.sendSuccess)(res, { contacts: Array.from(contactsMap.values()) });
}));
router.get('/', (0, validate_1.validate)({ query: zod_1.z.object({ peerUserId: gym_schema_1.objectIdSchema }) }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.auth.userId);
    const peerId = new mongoose_1.default.Types.ObjectId(req.query.peerUserId);
    const convo = await conversation_model_1.ConversationModel.findOne({
        channel: 'trainer_member',
        $or: [
            { userId, peerUserId: peerId },
            { userId: peerId, peerUserId: userId },
        ],
    });
    return (0, response_1.sendSuccess)(res, {
        messages: (convo?.messages || []).map((m) => ({
            senderId: m.senderId?.toString(),
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}));
router.post('/', (0, validate_1.validate)({
    body: zod_1.z.object({
        peerUserId: gym_schema_1.objectIdSchema,
        content: zod_1.z.string().trim().min(1).max(2000),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.auth.userId);
    const peerId = new mongoose_1.default.Types.ObjectId(req.body.peerUserId);
    let convo = await conversation_model_1.ConversationModel.findOne({
        channel: 'trainer_member',
        $or: [
            { userId, peerUserId: peerId },
            { userId: peerId, peerUserId: userId },
        ],
    });
    if (!convo) {
        convo = new conversation_model_1.ConversationModel({
            gymId: req.auth.activeGymId ? new mongoose_1.default.Types.ObjectId(req.auth.activeGymId) : undefined,
            userId,
            peerUserId: peerId,
            channel: 'trainer_member',
            messages: [],
        });
    }
    const msgRole = req.auth.role === 'trainer' ? 'trainer' : 'member';
    convo.messages.push({
        senderId: userId,
        role: msgRole,
        content: req.body.content,
        createdAt: new Date(),
    });
    await convo.save();
    await (0, notification_service_1.createAndDispatchNotification)({
        userId: req.body.peerUserId,
        gymId: req.auth.activeGymId,
        type: 'trainer_message',
        title: 'New Coaching Message',
        body: req.body.content.slice(0, 140),
    });
    return (0, response_1.sendSuccess)(res, { sent: true }, { statusCode: 201 });
}));
exports.messageRoutes = router;
