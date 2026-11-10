"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const errors_1 = require("../../utils/errors");
const response_1 = require("../../utils/response");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const gym_schema_1 = require("../gyms/gym.schema");
const payment_model_1 = require("../payments/payment.model");
const user_model_1 = require("../users/user.model");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorizeRoles)('super_admin'));
router.get('/overview', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [totalGyms, activeGyms, totalUsers, gyms, users, auditLogs, revAgg] = await Promise.all([
        gym_model_1.GymModel.countDocuments({ isDeleted: { $ne: true } }),
        gym_model_1.GymModel.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
        user_model_1.UserModel.countDocuments({ isDeleted: { $ne: true } }),
        gym_model_1.GymModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20),
        user_model_1.UserModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20),
        auditLog_model_1.AuditLogModel.find().sort({ createdAt: -1 }).limit(25),
        payment_model_1.PaymentModel.aggregate([
            { $match: { status: { $in: ['paid', 'partially_refunded'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);
    return (0, response_1.sendSuccess)(res, {
        metrics: {
            totalGyms,
            activeGyms,
            totalUsers,
            subscriptionRevenue: revAgg[0]?.total ?? 0,
        },
        gyms: gyms.map((g) => ({
            id: g._id.toString(),
            name: g.name,
            contactEmail: g.contactEmail,
            status: g.status,
            subscriptionTier: g.subscriptionTier,
            createdAt: g.createdAt.toISOString(),
        })),
        users: users.map((u) => u.toProfileDTO()),
        auditLogs: auditLogs.map((a) => ({
            id: a._id.toString(),
            action: a.action,
            resourceType: a.resourceType,
            actorRole: a.actorRole,
            createdAt: a.createdAt.toISOString(),
        })),
    });
}));
router.patch('/gyms/:id/status', (0, validate_1.validate)({
    params: zod_1.z.object({ id: gym_schema_1.objectIdSchema }),
    body: zod_1.z.object({ status: zod_1.z.enum(['active', 'suspended', 'pending']) }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const gym = await gym_model_1.GymModel.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, { $set: { status: req.body.status } }, { new: true });
    if (!gym)
        throw new errors_1.NotFoundError('Gym not found');
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(req.auth.userId),
        actorRole: req.auth.role,
        gymId: gym._id,
        action: `ADMIN_GYM_${req.body.status.toUpperCase()}`,
        resourceType: 'Gym',
        resourceId: gym._id.toString(),
    });
    return (0, response_1.sendSuccess)(res, { id: gym._id.toString(), status: gym.status });
}));
router.patch('/users/:id/status', (0, validate_1.validate)({
    params: zod_1.z.object({ id: gym_schema_1.objectIdSchema }),
    body: zod_1.z.object({ status: zod_1.z.enum(['active', 'suspended']) }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.UserModel.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, { $set: { status: req.body.status } }, { new: true });
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    return (0, response_1.sendSuccess)(res, { user: user.toProfileDTO() });
}));
exports.adminRoutes = router;
