"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
const errors_1 = require("../../utils/errors");
const response_1 = require("../../utils/response");
const gym_model_1 = require("../gyms/gym.model");
const gym_schema_1 = require("../gyms/gym.schema");
const gymMember_model_1 = require("../members/gymMember.model");
const notification_service_1 = require("../notifications/notification.service");
const attendance_model_1 = require("./attendance.model");
function signQrPayload(data) {
    return crypto_1.default
        .createHmac('sha256', env_1.env.JWT_ACCESS_SECRET)
        .update(data)
        .digest('hex');
}
function verifyQrToken(token) {
    const parts = token.split('.');
    if (parts.length !== 2) {
        throw new errors_1.BadRequestError('Invalid QR token format');
    }
    const [encodedPayload, sig] = parts;
    const expected = signQrPayload(encodedPayload);
    if (sig.length !== expected.length || !crypto_1.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        throw new errors_1.BadRequestError('Invalid QR token signature');
    }
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (Date.now() > parsed.expiresAt) {
        throw new errors_1.BadRequestError('QR check-in token has expired');
    }
    return { gymId: parsed.gymId, branchId: parsed.branchId };
}
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/qr-token', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer'), (0, validate_1.validate)({
    body: zod_1.z.object({
        gymId: gym_schema_1.objectIdSchema,
        branchId: gym_schema_1.objectIdSchema.optional(),
        ttlMinutes: zod_1.z.coerce.number().int().min(1).max(1440).default(15),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { gymId, branchId, ttlMinutes } = req.body;
    if (req.auth.role !== 'super_admin' && !req.auth.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const payload = {
        gymId,
        branchId,
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const qrToken = `${encoded}.${signQrPayload(encoded)}`;
    return (0, response_1.sendSuccess)(res, {
        qrToken,
        expiresAt: new Date(payload.expiresAt).toISOString(),
    });
}));
router.post('/check-in', (0, validate_1.validate)({
    body: zod_1.z.object({
        qrToken: zod_1.z.string().optional(),
        gymId: gym_schema_1.objectIdSchema.optional(),
        branchId: gym_schema_1.objectIdSchema.optional(),
        memberId: gym_schema_1.objectIdSchema.optional(),
        membershipCode: zod_1.z.string().trim().optional(),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let gymId = req.body.gymId;
    let branchId = req.body.branchId;
    let method = 'manual';
    if (req.body.qrToken) {
        const decoded = verifyQrToken(req.body.qrToken);
        gymId = decoded.gymId;
        branchId = decoded.branchId;
        method = 'qr';
    }
    if (!gymId) {
        gymId = req.auth.activeGymId;
    }
    if (!gymId) {
        throw new errors_1.BadRequestError('gymId or qrToken is required');
    }
    if (req.auth.role !== 'super_admin' && !req.auth.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    let member;
    if (req.body.memberId) {
        member = await gymMember_model_1.GymMemberModel.findOne({ _id: req.body.memberId, gymId, isDeleted: { $ne: true } });
    }
    else if (req.body.membershipCode) {
        member = await gymMember_model_1.GymMemberModel.findOne({
            membershipCode: req.body.membershipCode,
            gymId,
            isDeleted: { $ne: true },
        });
    }
    else {
        member = await gymMember_model_1.GymMemberModel.findOne({
            userId: req.auth.userId,
            gymId,
            isDeleted: { $ne: true },
        });
    }
    if (!member) {
        throw new errors_1.NotFoundError('Active gym membership record not found');
    }
    if (member.status === 'suspended') {
        throw new errors_1.ForbiddenError('Membership is suspended; check-in blocked');
    }
    const dateKey = new Date().toISOString().slice(0, 10);
    const existingOpen = await attendance_model_1.AttendanceModel.findOne({
        gymId,
        memberId: member._id,
        dateKey,
        status: 'checked_in',
    });
    if (existingOpen) {
        throw new errors_1.ConflictError('Member is already checked in today');
    }
    const record = await attendance_model_1.AttendanceModel.create({
        gymId: new mongoose_1.default.Types.ObjectId(gymId),
        branchId: branchId ? new mongoose_1.default.Types.ObjectId(branchId) : undefined,
        memberId: member._id,
        userId: member.userId,
        dateKey,
        checkInAt: new Date(),
        method,
        status: 'checked_in',
    });
    const gym = await gym_model_1.GymModel.findById(gymId).select('name');
    await (0, notification_service_1.createAndDispatchNotification)({
        userId: member.userId.toString(),
        gymId,
        type: 'attendance_confirmation',
        title: 'Gym Check-In Confirmed',
        body: `Checked in at ${gym?.name || 'your gym'} (${method.toUpperCase()}). Have a great session!`,
        metadata: { attendanceId: record._id.toString() },
    });
    return (0, response_1.sendSuccess)(res, {
        attendance: {
            id: record._id.toString(),
            gymId: record.gymId.toString(),
            memberId: record.memberId.toString(),
            dateKey: record.dateKey,
            checkInAt: record.checkInAt.toISOString(),
            method: record.method,
            status: record.status,
        },
    }, { statusCode: 201, message: 'Checked in successfully' });
}));
router.post('/check-out', (0, validate_1.validate)({
    body: zod_1.z.object({
        gymId: gym_schema_1.objectIdSchema.optional(),
        memberId: gym_schema_1.objectIdSchema.optional(),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const gymId = req.body.gymId || req.auth.activeGymId;
    if (!gymId) {
        throw new errors_1.BadRequestError('gymId is required');
    }
    const filter = {
        gymId: new mongoose_1.default.Types.ObjectId(gymId),
        status: 'checked_in',
    };
    if (req.body.memberId) {
        filter.memberId = new mongoose_1.default.Types.ObjectId(req.body.memberId);
    }
    else {
        filter.userId = new mongoose_1.default.Types.ObjectId(req.auth.userId);
    }
    const record = await attendance_model_1.AttendanceModel.findOne(filter).sort({ checkInAt: -1 });
    if (!record) {
        throw new errors_1.NotFoundError('No active check-in found');
    }
    record.checkOutAt = new Date();
    record.status = 'checked_out';
    await record.save();
    return (0, response_1.sendSuccess)(res, {
        attendance: {
            id: record._id.toString(),
            status: record.status,
            checkInAt: record.checkInAt.toISOString(),
            checkOutAt: record.checkOutAt.toISOString(),
        },
    }, { message: 'Checked out successfully' });
}));
router.get('/', (0, validate_1.validate)({
    query: zod_1.z.object({
        gymId: gym_schema_1.objectIdSchema.optional(),
        dateKey: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
    }),
}), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const gymId = req.query.gymId || req.auth.activeGymId;
    if (gymId && req.auth.role !== 'super_admin' && !req.auth.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const filter = {};
    if (gymId)
        filter.gymId = new mongoose_1.default.Types.ObjectId(gymId);
    if (req.query.dateKey)
        filter.dateKey = req.query.dateKey;
    if (req.auth.role === 'member') {
        filter.userId = new mongoose_1.default.Types.ObjectId(req.auth.userId);
    }
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
        attendance_model_1.AttendanceModel.find(filter)
            .sort({ checkInAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId'),
        attendance_model_1.AttendanceModel.countDocuments(filter),
    ]);
    return (0, response_1.sendSuccess)(res, {
        attendance: records.map((r) => ({
            id: r._id.toString(),
            gymId: r.gymId.toString(),
            memberId: r.memberId.toString(),
            dateKey: r.dateKey,
            checkInAt: r.checkInAt.toISOString(),
            checkOutAt: r.checkOutAt?.toISOString(),
            method: r.method,
            status: r.status,
            memberName: r.userId ? `${r.userId.firstName} ${r.userId.lastName}` : undefined,
        })),
    }, {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    });
}));
exports.attendanceRoutes = router;
