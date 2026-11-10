"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGymMember = createGymMember;
exports.listGymMembers = listGymMembers;
exports.getMemberById = getMemberById;
exports.updateMember = updateMember;
exports.deleteMember = deleteMember;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../config/env");
const errors_1 = require("../../utils/errors");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const trainer_model_1 = require("../trainers/trainer.model");
const user_model_1 = require("../users/user.model");
const gymMember_model_1 = require("./gymMember.model");
function assertGymAccess(actor, gymId) {
    if (actor.role === 'super_admin')
        return;
    if (!actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
}
function generateMembershipCode() {
    return `FC-${crypto_1.default.randomBytes(3).toString('hex').toUpperCase()}`;
}
function toMemberDTO(member, user) {
    return {
        id: member._id.toString(),
        gymId: member.gymId.toString(),
        branchId: member.branchId?.toString(),
        userId: user._id.toString(),
        assignedTrainerId: member.assignedTrainerId?.toString(),
        membershipCode: member.membershipCode,
        status: member.status,
        fitnessGoal: member.fitnessGoal,
        experienceLevel: member.experienceLevel,
        joinedAt: member.joinedAt.toISOString(),
        notes: member.notes,
        user: {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
        },
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
    };
}
async function createGymMember(actor, gymId, input) {
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
            role: 'member',
            status: 'active',
            isEmailVerified: false,
            gymIds: [gym._id],
            activeGymId: gym._id,
        });
    }
    else {
        const existingMembership = await gymMember_model_1.GymMemberModel.findOne({
            gymId: gym._id,
            userId: user._id,
        });
        if (existingMembership && !existingMembership.isDeleted) {
            throw new errors_1.ConflictError('User is already registered as a member of this gym');
        }
        await user_model_1.UserModel.updateOne({ _id: user._id }, {
            $addToSet: { gymIds: gym._id },
            ...(user.activeGymId ? {} : { $set: { activeGymId: gym._id } }),
        });
        if (existingMembership && existingMembership.isDeleted) {
            existingMembership.isDeleted = false;
            existingMembership.deletedAt = undefined;
            existingMembership.status = input.status;
            existingMembership.branchId = input.branchId
                ? new mongoose_1.default.Types.ObjectId(input.branchId)
                : undefined;
            existingMembership.fitnessGoal = input.fitnessGoal;
            existingMembership.experienceLevel = input.experienceLevel;
            existingMembership.notes = input.notes;
            await existingMembership.save();
            return toMemberDTO(existingMembership, user);
        }
    }
    const membershipCode = input.membershipCode || generateMembershipCode();
    if (input.assignedTrainerId) {
        const validTrainer = await trainer_model_1.TrainerModel.exists({
            _id: input.assignedTrainerId,
            gymId: gym._id,
            isDeleted: { $ne: true },
        });
        if (!validTrainer) {
            throw new errors_1.BadRequestError('Assigned trainer does not belong to this gym');
        }
    }
    const member = await gymMember_model_1.GymMemberModel.create({
        gymId: gym._id,
        branchId: input.branchId ? new mongoose_1.default.Types.ObjectId(input.branchId) : undefined,
        assignedTrainerId: input.assignedTrainerId
            ? new mongoose_1.default.Types.ObjectId(input.assignedTrainerId)
            : undefined,
        userId: user._id,
        membershipCode,
        status: input.status,
        fitnessGoal: input.fitnessGoal,
        experienceLevel: input.experienceLevel,
        notes: input.notes,
    });
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: gym._id,
        action: 'MEMBER_REGISTERED',
        resourceType: 'GymMember',
        resourceId: member._id.toString(),
    });
    return toMemberDTO(member, user);
}
async function listGymMembers(actor, gymId, query) {
    assertGymAccess(actor, gymId);
    const gymExists = await gym_model_1.GymModel.exists({ _id: gymId, isDeleted: { $ne: true } });
    if (!gymExists) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    const filter = {
        gymId: new mongoose_1.default.Types.ObjectId(gymId),
        isDeleted: { $ne: true },
    };
    if (actor.role === 'trainer') {
        const trainer = await trainer_model_1.TrainerModel.findOne({
            gymId: new mongoose_1.default.Types.ObjectId(gymId),
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            isDeleted: { $ne: true },
        }).select('_id');
        if (!trainer) {
            return {
                members: [],
                meta: { page: query.page, limit: query.limit, total: 0, totalPages: 1 },
            };
        }
        filter.assignedTrainerId = trainer._id;
    }
    if (query.status)
        filter.status = query.status;
    if (query.branchId)
        filter.branchId = new mongoose_1.default.Types.ObjectId(query.branchId);
    if (query.fitnessGoal)
        filter.fitnessGoal = query.fitnessGoal;
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
        const matchingUserIds = matchingUsers.map((u) => u._id);
        filter.$or = [
            { membershipCode: { $regex: escaped, $options: 'i' } },
            ...(matchingUserIds.length > 0 ? [{ userId: { $in: matchingUserIds } }] : []),
        ];
    }
    const skip = (query.page - 1) * query.limit;
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const [records, total] = await Promise.all([
        gymMember_model_1.GymMemberModel.find(filter)
            .sort({ [query.sortBy]: sortOrder })
            .skip(skip)
            .limit(query.limit)
            .populate('userId'),
        gymMember_model_1.GymMemberModel.countDocuments(filter),
    ]);
    const members = records
        .filter((r) => r.userId)
        .map((r) => toMemberDTO(r, r.userId));
    return {
        members,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
async function getMemberById(actor, memberId) {
    const member = await gymMember_model_1.GymMemberModel.findOne({
        _id: memberId,
        isDeleted: { $ne: true },
    }).populate('userId');
    if (!member || !member.userId) {
        throw new errors_1.NotFoundError('Member not found');
    }
    const gymId = member.gymId.toString();
    assertGymAccess(actor, gymId);
    if (actor.role === 'member' && member.userId._id.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Members can only view their own membership profile');
    }
    if (actor.role === 'trainer') {
        const trainer = await trainer_model_1.TrainerModel.findOne({
            gymId: member.gymId,
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            isDeleted: { $ne: true },
        }).select('_id');
        if (!trainer || !member.assignedTrainerId || !member.assignedTrainerId.equals(trainer._id)) {
            throw new errors_1.ForbiddenError('Trainers can only access members assigned to them');
        }
    }
    return toMemberDTO(member, member.userId);
}
async function updateMember(actor, memberId, input) {
    const member = await gymMember_model_1.GymMemberModel.findOne({
        _id: memberId,
        isDeleted: { $ne: true },
    });
    if (!member) {
        throw new errors_1.NotFoundError('Member not found');
    }
    assertGymAccess(actor, member.gymId.toString());
    const user = await user_model_1.UserModel.findOne({ _id: member.userId, isDeleted: { $ne: true } });
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
        member.branchId = input.branchId ? new mongoose_1.default.Types.ObjectId(input.branchId) : undefined;
    }
    if (input.assignedTrainerId !== undefined) {
        if (input.assignedTrainerId) {
            const validTrainer = await trainer_model_1.TrainerModel.exists({
                _id: input.assignedTrainerId,
                gymId: member.gymId,
                isDeleted: { $ne: true },
            });
            if (!validTrainer) {
                throw new errors_1.BadRequestError('Assigned trainer does not belong to this gym');
            }
            member.assignedTrainerId = new mongoose_1.default.Types.ObjectId(input.assignedTrainerId);
        }
        else {
            member.assignedTrainerId = undefined;
        }
    }
    if (input.status !== undefined)
        member.status = input.status;
    if (input.fitnessGoal !== undefined)
        member.fitnessGoal = input.fitnessGoal ?? undefined;
    if (input.experienceLevel !== undefined) {
        member.experienceLevel = input.experienceLevel ?? undefined;
    }
    if (input.notes !== undefined)
        member.notes = input.notes;
    await member.save();
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: member.gymId,
        action: 'MEMBER_UPDATED',
        resourceType: 'GymMember',
        resourceId: member._id.toString(),
    });
    return toMemberDTO(member, user);
}
async function deleteMember(actor, memberId) {
    const member = await gymMember_model_1.GymMemberModel.findOne({
        _id: memberId,
        isDeleted: { $ne: true },
    });
    if (!member) {
        throw new errors_1.NotFoundError('Member not found');
    }
    assertGymAccess(actor, member.gymId.toString());
    member.isDeleted = true;
    member.deletedAt = new Date();
    member.status = 'inactive';
    await member.save();
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: member.gymId,
        action: 'MEMBER_DELETED',
        resourceType: 'GymMember',
        resourceId: member._id.toString(),
    });
}
