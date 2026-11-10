import crypto from 'crypto';
import mongoose, { FilterQuery } from 'mongoose';
import { GymDTO, OperatingHoursDTO, UserRole } from '@fitcore/shared-types';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogModel } from '../audit/auditLog.model';
import { UserModel } from '../users/user.model';
import { GymModel, IGym } from './gym.model';
import { CreateGymInput, ListGymsQuery, UpdateGymInput } from './gym.schema';

const DEFAULT_OPERATING_HOURS: OperatingHoursDTO[] = [
  { day: 'Monday', open: '05:30', close: '22:30', isClosed: false },
  { day: 'Tuesday', open: '05:30', close: '22:30', isClosed: false },
  { day: 'Wednesday', open: '05:30', close: '22:30', isClosed: false },
  { day: 'Thursday', open: '05:30', close: '22:30', isClosed: false },
  { day: 'Friday', open: '05:30', close: '22:30', isClosed: false },
  { day: 'Saturday', open: '06:00', close: '21:00', isClosed: false },
  { day: 'Sunday', open: '07:00', close: '18:00', isClosed: false },
];

export interface AuthActor {
  userId: string;
  role: UserRole;
  gymIds: string[];
  activeGymId?: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'gym'}-${suffix}`;
}

export function toGymDTO(gym: IGym): GymDTO {
  return {
    id: gym._id.toString(),
    ownerId: gym.ownerId.toString(),
    name: gym.name,
    slug: gym.slug,
    description: gym.description,
    logoUrl: gym.logoUrl,
    contactEmail: gym.contactEmail,
    contactPhone: gym.contactPhone,
    website: gym.website,
    timezone: gym.timezone,
    currency: gym.currency,
    operatingHours: (gym.operatingHours || []).map((oh) => ({
      day: oh.day,
      open: oh.open,
      close: oh.close,
      isClosed: oh.isClosed,
    })),
    branches: (gym.branches || []).map((b) => ({
      id: b._id.toString(),
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      postalCode: b.postalCode,
      phone: b.phone,
      isPrimary: b.isPrimary,
    })),
    status: gym.status,
    subscriptionTier: gym.subscriptionTier,
    createdAt: gym.createdAt.toISOString(),
    updatedAt: gym.updatedAt.toISOString(),
  };
}

export async function createGym(actor: AuthActor, input: CreateGymInput): Promise<GymDTO> {
  const gym = await GymModel.create({
    ownerId: new mongoose.Types.ObjectId(actor.userId),
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    website: input.website || undefined,
    timezone: input.timezone,
    currency: input.currency,
    operatingHours:
      input.operatingHours && input.operatingHours.length > 0
        ? input.operatingHours
        : DEFAULT_OPERATING_HOURS,
    branches: (input.branches || []).map((b, idx) => ({
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      postalCode: b.postalCode,
      phone: b.phone,
      isPrimary: b.isPrimary ?? idx === 0,
    })),
    status: 'active',
    subscriptionTier: 'starter',
  });

  await UserModel.updateOne(
    { _id: actor.userId },
    {
      $addToSet: { gymIds: gym._id },
      $set: { activeGymId: gym._id },
    }
  );

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: gym._id,
    action: 'GYM_CREATED',
    resourceType: 'Gym',
    resourceId: gym._id.toString(),
  });

  return toGymDTO(gym);
}

export async function listGyms(
  actor: AuthActor,
  query: ListGymsQuery
): Promise<{ gyms: GymDTO[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const filter: FilterQuery<IGym> = { isDeleted: { $ne: true } };

  if (actor.role !== 'super_admin') {
    filter._id = { $in: actor.gymIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { contactEmail: { $regex: escaped, $options: 'i' } },
      { 'branches.city': { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    GymModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    GymModel.countDocuments(filter),
  ]);

  return {
    gyms: items.map(toGymDTO),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getGymById(actor: AuthActor, gymId: string): Promise<GymDTO> {
  if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }

  const gym = await GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  return toGymDTO(gym);
}

export async function updateGym(
  actor: AuthActor,
  gymId: string,
  input: UpdateGymInput
): Promise<GymDTO> {
  if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }

  const gym = await GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  if (input.name !== undefined) gym.name = input.name;
  if (input.description !== undefined) gym.description = input.description;
  if (input.contactEmail !== undefined) gym.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) gym.contactPhone = input.contactPhone;
  if (input.website !== undefined) gym.website = input.website || undefined;
  if (input.timezone !== undefined) gym.timezone = input.timezone;
  if (input.currency !== undefined) gym.currency = input.currency;
  if (input.operatingHours !== undefined) gym.operatingHours = input.operatingHours;
  if (input.branches !== undefined) {
    gym.branches = input.branches.map((b) => ({
      _id: b.id ? new mongoose.Types.ObjectId(b.id) : new mongoose.Types.ObjectId(),
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      postalCode: b.postalCode,
      phone: b.phone,
      isPrimary: b.isPrimary,
    }));
  }
  if (input.status !== undefined && actor.role === 'super_admin') {
    gym.status = input.status;
  }

  await gym.save();

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: gym._id,
    action: 'GYM_UPDATED',
    resourceType: 'Gym',
    resourceId: gym._id.toString(),
  });

  return toGymDTO(gym);
}

export async function deleteGym(actor: AuthActor, gymId: string): Promise<void> {
  if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }

  const gym = await GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  if (actor.role !== 'super_admin' && gym.ownerId.toString() !== actor.userId) {
    throw new ForbiddenError('Only the gym owner or super admin can delete this gym');
  }

  gym.isDeleted = true;
  gym.deletedAt = new Date();
  await gym.save();

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: gym._id,
    action: 'GYM_DELETED',
    resourceType: 'Gym',
    resourceId: gym._id.toString(),
  });
}

export async function switchActiveGym(actor: AuthActor, gymId: string): Promise<{ activeGymId: string }> {
  if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }

  const gym = await GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } }).select('_id');
  if (!gym) {
    throw new NotFoundError('Gym not found');
  }

  await UserModel.updateOne({ _id: actor.userId }, { $set: { activeGymId: gym._id } });
  return { activeGymId: gym._id.toString() };
}

