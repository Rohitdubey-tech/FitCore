"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrainer = createTrainer;
exports.listTrainers = listTrainers;
exports.getTrainerById = getTrainerById;
exports.updateTrainer = updateTrainer;
exports.assignMembersToTrainer = assignMembersToTrainer;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../config/env");
const errors_1 = require("../../utils/errors");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const gymMember_model_1 = require("../members/gymMember.model");
const user_model_1 = require("../users/user.model");
const trainer_model_1 = require("./trainer.model");
const DEFAULT_TRAINER_SCHEDULE = [
    { day: 'Monday', startTime: '06:00', endTime: '14:00', isAvailable: true },
    { day: 'Tuesday', startTime: '06:00', endTime: '14:00', isAvailable: true },
    { day: 'Wednesday', startTime: '06:00', endTime: '14:00', isAvailable: true },
    { day: 'Thursday', startTime: '06:00', endTime: '14:00', isAvailable: true },
    { day: 'Friday', startTime: '06:00', endTime: '14:00', isAvailable: true },
    { day: 'Saturday', startTime: '07:00', endTime: '12:00', isAvailable: true },
    { day: 'Sunday', startTime: '00:00', endTime: '00:00', isAvailable: false },
];
function assertGymAccess(actor, gymId) {
    if (actor.role === 'super_admin')
        return;
    if (!actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
}
function toTrainerDTO(trainer, user, assignedMemberCount) {
    return {
        id: trainer._id.toString(),
        gymId: trainer.gymId.toString(),
        branchId: trainer.branchId?.toString(),
        userId: user._id.toString(),
        specializations: trainer.specializations || [],
        certifications: trainer.certifications || [],
        experienceYears: trainer.experienceYears,
        bio: trainer.bio,
        hourlyRate: trainer.hourlyRate,
        schedule: (trainer.schedule || []).map((s) => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
        })),
        status: trainer.status,
        assignedMemberCount,
        user: {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
        },
        createdAt: trainer.createdAt.toISOString(),
        updatedAt: trainer.updatedAt.toISOString(),
    };
}
async function createTrainer(actor, gymId, input) {
    assertGymAccess(actor, gymId);
    const gym = await gym_model_1.GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
    if (!gym) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    let user = await user_model_1.UserModel.findOne({ email: input.email, isDeleted: { $ne: true } });
    if (!user) {
        const rawPassword = input.password || crypto_1.default.randomBytes(12).toString('base64url');
        const passwordHash = await bcryptjs_1.default.hash(rawPassword, env_1.env.BCRYPT_ROUNDS);
        user = await user_model_1.UserModel.create({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            passwordHash,
            role: 'trainer',
            status: 'active',
            isEmailVerified: false,
            gymIds: [gym._id],
            activeGymId: gym._id,
        });
    }
    else {
        const existingTrainer = await trainer_model_1.TrainerModel.findOne({
            gymId: gym._id,
            userId: user._id,
            isDeleted: { $ne: true },
        });
        if (existingTrainer) {
            throw new errors_1.ConflictError('User is already registered as a trainer in this gym');
        }
        await user_model_1.UserModel.updateOne({ _id: user._id }, {
            $addToSet: { gymIds: gym._id },
            ...(user.role === 'member' ? { $set: { role: 'trainer' } } : {}),
            ...(user.activeGymId ? {} : { $set: { activeGymId: gym._id } }),
        });
    }
    const trainer = await trainer_model_1.TrainerModel.create({
        gymId: gym._id,
        branchId: input.branchId ? new mongoose_1.default.Types.ObjectId(input.branchId) : undefined,
        userId: user._id,
        specializations: input.specializations,
        certifications: input.certifications,
        experienceYears: input.experienceYears,
        bio: input.bio,
        hourlyRate: input.hourlyRate,
        schedule: input.schedule && input.schedule.length > 0 ? input.schedule : DEFAULT_TRAINER_SCHEDULE,
        status: input.status,
    });
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: gym._id,
        action: 'TRAINER_ADDED',
        resourceType: 'Trainer',
        resourceId: trainer._id.toString(),
    });
    return toTrainerDTO(trainer, user, 0);
}
async function listTrainers(actor, gymId, query) {
    assertGymAccess(actor, gymId);
    const filter = {
        gymId: new mongoose_1.default.Types.ObjectId(gymId),
        isDeleted: { $ne: true },
    };
    if (query.status)
        filter.status = query.status;
    if (query.search) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchingUsers = await user_model_1.UserModel.find({
            isDeleted: { $ne: true },
            $or: [
                { firstName: { $regex: escaped, $options: 'i' } },
                { lastName: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ],
        }).select('_id');
        filter.$or = [
            { specializations: { $regex: escaped, $options: 'i' } },
            ...(matchingUsers.length > 0
                ? [{ userId: { $in: matchingUsers.map((u) => u._id) } }]
                : []),
        ];
    }
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await Promise.all([
        trainer_model_1.TrainerModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(query.limit)
            .populate('userId'),
        trainer_model_1.TrainerModel.countDocuments(filter),
    ]);
    const trainerIds = records.map((r) => r._id);
    const memberCounts = await gymMember_model_1.GymMemberModel.aggregate([
        {
            $match: {
                gymId: new mongoose_1.default.Types.ObjectId(gymId),
                assignedTrainerId: { $in: trainerIds },
                isDeleted: { $ne: true },
            },
        },
        { $group: { _id: '$assignedTrainerId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(memberCounts.map((c) => [c._id.toString(), c.count]));
    const trainers = records
        .filter((r) => r.userId)
        .map((r) => toTrainerDTO(r, r.userId, countMap.get(r._id.toString()) ?? 0));
    return {
        trainers,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
async function getTrainerById(actor, trainerId) {
    const trainer = await trainer_model_1.TrainerModel.findOne({
        _id: trainerId,
        isDeleted: { $ne: true },
    }).populate('userId');
    if (!trainer || !trainer.userId) {
        throw new errors_1.NotFoundError('Trainer not found');
    }
    assertGymAccess(actor, trainer.gymId.toString());
    if (actor.role === 'trainer' && trainer.userId._id.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Trainers can only view their own profile');
    }
    const assignedCount = await gymMember_model_1.GymMemberModel.countDocuments({
        gymId: trainer.gymId,
        assignedTrainerId: trainer._id,
        isDeleted: { $ne: true },
    });
    return toTrainerDTO(trainer, trainer.userId, assignedCount);
}
async function updateTrainer(actor, trainerId, input) {
    const trainer = await trainer_model_1.TrainerModel.findOne({
        _id: trainerId,
        isDeleted: { $ne: true },
    });
    if (!trainer) {
        throw new errors_1.NotFoundError('Trainer not found');
    }
    assertGymAccess(actor, trainer.gymId.toString());
    if (actor.role === 'trainer' && trainer.userId.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Trainers can only update their own profile');
    }
    const user = await user_model_1.UserModel.findOne({ _id: trainer.userId, isDeleted: { $ne: true } });
    if (!user) {
        throw new errors_1.NotFoundError('Linked user account not found');
    }
    if (input.firstName !== undefined)
        user.firstName = input.firstName;
    if (input.lastName !== undefined)
        user.lastName = input.lastName;
    if (input.phone !== undefined)
        user.phone = input.phone;
    await user.save();
    if (input.branchId !== undefined) {
        trainer.branchId = input.branchId ? new mongoose_1.default.Types.ObjectId(input.branchId) : undefined;
    }
    if (input.specializations !== undefined)
        trainer.specializations = input.specializations;
    if (input.certifications !== undefined)
        trainer.certifications = input.certifications;
    if (input.experienceYears !== undefined)
        trainer.experienceYears = input.experienceYears;
    if (input.bio !== undefined)
        trainer.bio = input.bio;
    if (input.hourlyRate !== undefined)
        trainer.hourlyRate = input.hourlyRate ?? undefined;
    if (input.schedule !== undefined)
        trainer.schedule = input.schedule;
    if (input.status !== undefined && (actor.role === 'super_admin' || actor.role === 'gym_admin')) {
        trainer.status = input.status;
    }
    await trainer.save();
    const assignedCount = await gymMember_model_1.GymMemberModel.countDocuments({
        gymId: trainer.gymId,
        assignedTrainerId: trainer._id,
        isDeleted: { $ne: true },
    });
    return toTrainerDTO(trainer, user, assignedCount);
}
async function assignMembersToTrainer(actor, trainerId, memberIds) {
    const trainer = await trainer_model_1.TrainerModel.findOne({
        _id: trainerId,
        isDeleted: { $ne: true },
    });
    if (!trainer) {
        throw new errors_1.NotFoundError('Trainer not found');
    }
    assertGymAccess(actor, trainer.gymId.toString());
    if (memberIds.length > 0) {
        const validMembersCount = await gymMember_model_1.GymMemberModel.countDocuments({
            _id: { $in: memberIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
            gymId: trainer.gymId,
            isDeleted: { $ne: true },
        });
        if (validMembersCount !== memberIds.length) {
            throw new errors_1.BadRequestError('One or more members do not belong to this gym');
        }
    }
    // Unassign any previous members not in the new list, then assign selected members
    await gymMember_model_1.GymMemberModel.updateMany({
        gymId: trainer.gymId,
        assignedTrainerId: trainer._id,
        _id: { $nin: memberIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
    }, { $unset: { assignedTrainerId: '' } });
    if (memberIds.length > 0) {
        await gymMember_model_1.GymMemberModel.updateMany({
            gymId: trainer.gymId,
            _id: { $in: memberIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
        }, { $set: { assignedTrainerId: trainer._id } });
    }
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: trainer.gymId,
        action: 'TRAINER_MEMBERS_ASSIGNED',
        resourceType: 'Trainer',
        resourceId: trainer._id.toString(),
        metadata: { memberCount: memberIds.length },
    });
    return { assignedCount: memberIds.length };
}
