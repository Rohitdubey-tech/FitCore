import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose, { FilterQuery } from 'mongoose';
import { TrainerDTO, TrainerScheduleSlotDTO } from '@fitcore/shared-types';
import { env } from '../../config/env';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { AuthActor } from '../gyms/gym.service';
import { GymMemberModel } from '../members/gymMember.model';
import { IUser, UserModel } from '../users/user.model';
import { ITrainer, TrainerModel } from './trainer.model';
import { CreateTrainerInput, ListTrainersQuery, UpdateTrainerInput } from './trainer.schema';

const DEFAULT_TRAINER_SCHEDULE: TrainerScheduleSlotDTO[] = [
  { day: 'Monday', startTime: '06:00', endTime: '14:00', isAvailable: true },
  { day: 'Tuesday', startTime: '06:00', endTime: '14:00', isAvailable: true },
  { day: 'Wednesday', startTime: '06:00', endTime: '14:00', isAvailable: true },
  { day: 'Thursday', startTime: '06:00', endTime: '14:00', isAvailable: true },
  { day: 'Friday', startTime: '06:00', endTime: '14:00', isAvailable: true },
  { day: 'Saturday', startTime: '07:00', endTime: '12:00', isAvailable: true },
  { day: 'Sunday', startTime: '00:00', endTime: '00:00', isAvailable: false },
];

function assertGymAccess(actor: AuthActor, gymId: string): void {
  if (actor.role === 'super_admin') return;
  if (!actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }
}

function toTrainerDTO(trainer: ITrainer, user: IUser, assignedMemberCount: number): TrainerDTO {
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

export async function createTrainer(
  actor: AuthActor,
  gymId: string,
  input: CreateTrainerInput
): Promise<TrainerDTO> {
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
      role: 'trainer',
      status: 'active',
      isEmailVerified: false,
      gymIds: [gym._id],
      activeGymId: gym._id,
    });
  } else {
    const existingTrainer = await TrainerModel.findOne({
      gymId: gym._id,
      userId: user._id,
      isDeleted: { $ne: true },
    });
    if (existingTrainer) {
      throw new ConflictError('User is already registered as a trainer in this gym');
    }
    await UserModel.updateOne(
      { _id: user._id },
      {
        $addToSet: { gymIds: gym._id },
        ...(user.role === 'member' ? { $set: { role: 'trainer' } } : {}),
        ...(user.activeGymId ? {} : { $set: { activeGymId: gym._id } }),
      }
    );
  }

  const trainer = await TrainerModel.create({
    gymId: gym._id,
    branchId: input.branchId ? new mongoose.Types.ObjectId(input.branchId) : undefined,
    userId: user._id,
    specializations: input.specializations,
    certifications: input.certifications,
    experienceYears: input.experienceYears,
    bio: input.bio,
    hourlyRate: input.hourlyRate,
    schedule:
      input.schedule && input.schedule.length > 0 ? input.schedule : DEFAULT_TRAINER_SCHEDULE,
    status: input.status,
  });

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: gym._id,
    action: 'TRAINER_ADDED',
    resourceType: 'Trainer',
    resourceId: trainer._id.toString(),
  });

  return toTrainerDTO(trainer, user, 0);
}

export async function listTrainers(
  actor: AuthActor,
  gymId: string,
  query: ListTrainersQuery
): Promise<{
  trainers: TrainerDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  assertGymAccess(actor, gymId);

  const filter: FilterQuery<ITrainer> = {
    gymId: new mongoose.Types.ObjectId(gymId),
    isDeleted: { $ne: true },
  };
  if (query.status) filter.status = query.status;

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

    filter.$or = [
      { specializations: { $regex: escaped, $options: 'i' } },
      ...(matchingUsers.length > 0
        ? [{ userId: { $in: matchingUsers.map((u) => u._id) } }]
        : []),
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    TrainerModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate<{ userId: IUser }>('userId'),
    TrainerModel.countDocuments(filter),
  ]);

  const trainerIds = records.map((r) => r._id);
  const memberCounts = await GymMemberModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        gymId: new mongoose.Types.ObjectId(gymId),
        assignedTrainerId: { $in: trainerIds },
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: '$assignedTrainerId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(memberCounts.map((c) => [c._id.toString(), c.count]));

  const trainers = records
    .filter((r) => r.userId)
    .map((r) =>
      toTrainerDTO(
        r as unknown as ITrainer,
        r.userId,
        countMap.get(r._id.toString()) ?? 0
      )
    );

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

export async function getTrainerById(actor: AuthActor, trainerId: string): Promise<TrainerDTO> {
  const trainer = await TrainerModel.findOne({
    _id: trainerId,
    isDeleted: { $ne: true },
  }).populate<{ userId: IUser }>('userId');

  if (!trainer || !trainer.userId) {
    throw new NotFoundError('Trainer not found');
  }

  assertGymAccess(actor, trainer.gymId.toString());

  if (actor.role === 'trainer' && trainer.userId._id.toString() !== actor.userId) {
    throw new ForbiddenError('Trainers can only view their own profile');
  }

  const assignedCount = await GymMemberModel.countDocuments({
    gymId: trainer.gymId,
    assignedTrainerId: trainer._id,
    isDeleted: { $ne: true },
  });

  return toTrainerDTO(trainer as unknown as ITrainer, trainer.userId, assignedCount);
}

export async function updateTrainer(
  actor: AuthActor,
  trainerId: string,
  input: UpdateTrainerInput
): Promise<TrainerDTO> {
  const trainer = await TrainerModel.findOne({
    _id: trainerId,
    isDeleted: { $ne: true },
  });
  if (!trainer) {
    throw new NotFoundError('Trainer not found');
  }

  assertGymAccess(actor, trainer.gymId.toString());

  if (actor.role === 'trainer' && trainer.userId.toString() !== actor.userId) {
    throw new ForbiddenError('Trainers can only update their own profile');
  }

  const user = await UserModel.findOne({ _id: trainer.userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new NotFoundError('Linked user account not found');
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone;
  await user.save();

  if (input.branchId !== undefined) {
    trainer.branchId = input.branchId ? new mongoose.Types.ObjectId(input.branchId) : undefined;
  }
  if (input.specializations !== undefined) trainer.specializations = input.specializations;
  if (input.certifications !== undefined) trainer.certifications = input.certifications;
  if (input.experienceYears !== undefined) trainer.experienceYears = input.experienceYears;
  if (input.bio !== undefined) trainer.bio = input.bio;
  if (input.hourlyRate !== undefined) trainer.hourlyRate = input.hourlyRate ?? undefined;
  if (input.schedule !== undefined) trainer.schedule = input.schedule;
  if (input.status !== undefined && (actor.role === 'super_admin' || actor.role === 'gym_admin')) {
    trainer.status = input.status;
  }

  await trainer.save();

  const assignedCount = await GymMemberModel.countDocuments({
    gymId: trainer.gymId,
    assignedTrainerId: trainer._id,
    isDeleted: { $ne: true },
  });

  return toTrainerDTO(trainer, user, assignedCount);
}

export async function assignMembersToTrainer(
  actor: AuthActor,
  trainerId: string,
  memberIds: string[]
): Promise<{ assignedCount: number }> {
  const trainer = await TrainerModel.findOne({
    _id: trainerId,
    isDeleted: { $ne: true },
  });
  if (!trainer) {
    throw new NotFoundError('Trainer not found');
  }

  assertGymAccess(actor, trainer.gymId.toString());

  if (memberIds.length > 0) {
    const validMembersCount = await GymMemberModel.countDocuments({
      _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
      gymId: trainer.gymId,
      isDeleted: { $ne: true },
    });
    if (validMembersCount !== memberIds.length) {
      throw new BadRequestError('One or more members do not belong to this gym');
    }
  }

  // Unassign any previous members not in the new list, then assign selected members
  await GymMemberModel.updateMany(
    {
      gymId: trainer.gymId,
      assignedTrainerId: trainer._id,
      _id: { $nin: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
    },
    { $unset: { assignedTrainerId: '' } }
  );

  if (memberIds.length > 0) {
    await GymMemberModel.updateMany(
      {
        gymId: trainer.gymId,
        _id: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
      { $set: { assignedTrainerId: trainer._id } }
    );
  }

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: trainer.gymId,
    action: 'TRAINER_MEMBERS_ASSIGNED',
    resourceType: 'Trainer',
    resourceId: trainer._id.toString(),
    metadata: { memberCount: memberIds.length },
  });

  return { assignedCount: memberIds.length };
}
