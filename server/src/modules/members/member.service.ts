import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose, { FilterQuery } from 'mongoose';
import { GymMemberDTO } from '@fitcore/shared-types';
import { env } from '../../config/env';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { AuthActor } from '../gyms/gym.service';
import { TrainerModel } from '../trainers/trainer.model';
import { IUser, UserModel } from '../users/user.model';
import { GymMemberModel, IGymMember } from './gymMember.model';
import { CreateMemberInput, ListMembersQuery, UpdateMemberInput } from './member.schema';

function assertGymAccess(actor: AuthActor, gymId: string): void {
  if (actor.role === 'super_admin') return;
  if (!actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }
}

function generateMembershipCode(): string {
  return `FC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function toMemberDTO(member: IGymMember, user: IUser): GymMemberDTO {
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

export async function createGymMember(
  actor: AuthActor,
  gymId: string,
  input: CreateMemberInput
): Promise<GymMemberDTO> {
  assertGymAccess(actor, gymId);

  const gym = await GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  let user = await UserModel.findOne({ email: input.email, isDeleted: { $ne: true } });
  if (!user) {
    const rawPassword = input.password || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, env.BCRYPT_ROUNDS);
    user = await UserModel.create({
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
  } else {
    const existingMembership = await GymMemberModel.findOne({
      gymId: gym._id,
      userId: user._id,
    });
    if (existingMembership && !existingMembership.isDeleted) {
      throw new ConflictError('User is already registered as a member of this gym');
    }

    await UserModel.updateOne(
      { _id: user._id },
      {
        $addToSet: { gymIds: gym._id },
        ...(user.activeGymId ? {} : { $set: { activeGymId: gym._id } }),
      }
    );

    if (existingMembership && existingMembership.isDeleted) {
      existingMembership.isDeleted = false;
      existingMembership.deletedAt = undefined;
      existingMembership.status = input.status;
      existingMembership.branchId = input.branchId
        ? new mongoose.Types.ObjectId(input.branchId)
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
    const validTrainer = await TrainerModel.exists({
      _id: input.assignedTrainerId,
      gymId: gym._id,
      isDeleted: { $ne: true },
    });
    if (!validTrainer) {
      throw new BadRequestError('Assigned trainer does not belong to this gym');
    }
  }

  const member = await GymMemberModel.create({
    gymId: gym._id,
    branchId: input.branchId ? new mongoose.Types.ObjectId(input.branchId) : undefined,
    assignedTrainerId: input.assignedTrainerId
      ? new mongoose.Types.ObjectId(input.assignedTrainerId)
      : undefined,
    userId: user._id,
    membershipCode,
    status: input.status,
    fitnessGoal: input.fitnessGoal,
    experienceLevel: input.experienceLevel,
    notes: input.notes,
  });

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: gym._id,
    action: 'MEMBER_REGISTERED',
    resourceType: 'GymMember',
    resourceId: member._id.toString(),
  });

  return toMemberDTO(member, user);
}

export async function listGymMembers(
  actor: AuthActor,
  gymId: string,
  query: ListMembersQuery
): Promise<{
  members: GymMemberDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  assertGymAccess(actor, gymId);

  const gymExists = await GymModel.exists({ _id: gymId, isDeleted: { $ne: true } });
  if (!gymExists) {
    throw new NotFoundError('Gym not found');
  }

  const filter: FilterQuery<IGymMember> = {
    gymId: new mongoose.Types.ObjectId(gymId),
    isDeleted: { $ne: true },
  };

  if (actor.role === 'trainer') {
    const trainer = await TrainerModel.findOne({
      gymId: new mongoose.Types.ObjectId(gymId),
      userId: new mongoose.Types.ObjectId(actor.userId),
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

  if (query.status) filter.status = query.status;
  if (query.branchId) filter.branchId = new mongoose.Types.ObjectId(query.branchId);
  if (query.fitnessGoal) filter.fitnessGoal = query.fitnessGoal;

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingUsers = await UserModel.find({
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
    GymMemberModel.find(filter)
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.limit)
      .populate<{ userId: IUser }>('userId'),
    GymMemberModel.countDocuments(filter),
  ]);

  const members = records
    .filter((r) => r.userId)
    .map((r) => toMemberDTO(r as unknown as IGymMember, r.userId));

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

export async function getMemberById(actor: AuthActor, memberId: string): Promise<GymMemberDTO> {
  const member = await GymMemberModel.findOne({
    _id: memberId,
    isDeleted: { $ne: true },
  }).populate<{ userId: IUser }>('userId');

  if (!member || !member.userId) {
    throw new NotFoundError('Member not found');
  }

  const gymId = member.gymId.toString();
  assertGymAccess(actor, gymId);

  if (actor.role === 'member' && member.userId._id.toString() !== actor.userId) {
    throw new ForbiddenError('Members can only view their own membership profile');
  }

  if (actor.role === 'trainer') {
    const trainer = await TrainerModel.findOne({
      gymId: member.gymId,
      userId: new mongoose.Types.ObjectId(actor.userId),
      isDeleted: { $ne: true },
    }).select('_id');
    if (!trainer || !member.assignedTrainerId || !member.assignedTrainerId.equals(trainer._id)) {
      throw new ForbiddenError('Trainers can only access members assigned to them');
    }
  }

  return toMemberDTO(member as unknown as IGymMember, member.userId);
}

export async function updateMember(
  actor: AuthActor,
  memberId: string,
  input: UpdateMemberInput
): Promise<GymMemberDTO> {
  const member = await GymMemberModel.findOne({
    _id: memberId,
    isDeleted: { $ne: true },
  });

  if (!member) {
    throw new NotFoundError('Member not found');
  }

  assertGymAccess(actor, member.gymId.toString());

  const user = await UserModel.findOne({ _id: member.userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new NotFoundError('Linked user account not found');
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone;
  await user.save();

  if (input.branchId !== undefined) {
    member.branchId = input.branchId ? new mongoose.Types.ObjectId(input.branchId) : undefined;
  }
  if (input.assignedTrainerId !== undefined) {
    if (input.assignedTrainerId) {
      const validTrainer = await TrainerModel.exists({
        _id: input.assignedTrainerId,
        gymId: member.gymId,
        isDeleted: { $ne: true },
      });
      if (!validTrainer) {
        throw new BadRequestError('Assigned trainer does not belong to this gym');
      }
      member.assignedTrainerId = new mongoose.Types.ObjectId(input.assignedTrainerId);
    } else {
      member.assignedTrainerId = undefined;
    }
  }
  if (input.status !== undefined) member.status = input.status;
  if (input.fitnessGoal !== undefined) member.fitnessGoal = input.fitnessGoal ?? undefined;
  if (input.experienceLevel !== undefined) {
    member.experienceLevel = input.experienceLevel ?? undefined;
  }
  if (input.notes !== undefined) member.notes = input.notes;
  await member.save();

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: member.gymId,
    action: 'MEMBER_UPDATED',
    resourceType: 'GymMember',
    resourceId: member._id.toString(),
  });

  return toMemberDTO(member, user);
}

export async function deleteMember(actor: AuthActor, memberId: string): Promise<void> {
  const member = await GymMemberModel.findOne({
    _id: memberId,
    isDeleted: { $ne: true },
  });

  if (!member) {
    throw new NotFoundError('Member not found');
  }

  assertGymAccess(actor, member.gymId.toString());

  member.isDeleted = true;
  member.deletedAt = new Date();
  member.status = 'inactive';
  await member.save();

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: member.gymId,
    action: 'MEMBER_DELETED',
    resourceType: 'GymMember',
    resourceId: member._id.toString(),
  });
}

