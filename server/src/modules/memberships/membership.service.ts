import mongoose, { FilterQuery } from 'mongoose';
import {
  MembershipPlanDTO,
  PlanDurationType,
  SubscriptionDTO,
} from '@fitcore/shared-types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { AuthActor } from '../gyms/gym.service';
import { GymMemberModel, IGymMember } from '../members/gymMember.model';
import { IUser } from '../users/user.model';
import { IMembershipPlan, MembershipPlanModel } from './membershipPlan.model';
import { ISubscription, SubscriptionModel } from './subscription.model';
import {
  CreatePlanInput,
  CreateSubscriptionInput,
  ListPlansQuery,
  ListSubscriptionsQuery,
  UpdatePlanInput,
  UpdateSubscriptionInput,
} from './membership.schema';

const DURATION_DEFAULTS: Record<Exclude<PlanDurationType, 'custom'>, number> = {
  monthly: 30,
  quarterly: 90,
  half_yearly: 180,
  annual: 365,
};

function assertGymAccess(actor: AuthActor, gymId: string): void {
  if (actor.role === 'super_admin') return;
  if (!actor.gymIds.includes(gymId)) {
    throw new ForbiddenError('Cross-tenant gym access denied');
  }
}

function toPlanDTO(plan: IMembershipPlan): MembershipPlanDTO {
  return {
    id: plan._id.toString(),
    gymId: plan.gymId.toString(),
    name: plan.name,
    description: plan.description,
    durationType: plan.durationType,
    durationDays: plan.durationDays,
    price: plan.price,
    currency: plan.currency,
    features: plan.features || [],
    includesPersonalTraining: plan.includesPersonalTraining,
    status: plan.status,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function toSubscriptionDTO(
  sub: ISubscription,
  plan?: IMembershipPlan | null,
  member?: (IGymMember & { userId?: IUser }) | null
): SubscriptionDTO {
  return {
    id: sub._id.toString(),
    gymId: sub.gymId.toString(),
    memberId: sub.memberId.toString(),
    userId: sub.userId.toString(),
    planId: sub.planId.toString(),
    status: sub.status,
    startDate: sub.startDate.toISOString(),
    endDate: sub.endDate.toISOString(),
    autoRenew: sub.autoRenew,
    renewalCount: sub.renewalCount,
    suspendedReason: sub.suspendedReason,
    ...(plan
      ? {
          plan: {
            id: plan._id.toString(),
            name: plan.name,
            durationType: plan.durationType,
            durationDays: plan.durationDays,
            price: plan.price,
            currency: plan.currency,
          },
        }
      : {}),
    ...(member && member.userId
      ? {
          member: {
            id: member._id.toString(),
            membershipCode: member.membershipCode,
            firstName: member.userId.firstName,
            lastName: member.userId.lastName,
            email: member.userId.email,
          },
        }
      : {}),
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}

export async function createPlan(
  actor: AuthActor,
  input: CreatePlanInput
): Promise<MembershipPlanDTO> {
  assertGymAccess(actor, input.gymId);

  const gymExists = await GymModel.exists({ _id: input.gymId, isDeleted: { $ne: true } });
  if (!gymExists) {
    throw new NotFoundError('Gym not found');
  }

  let durationDays = input.durationDays;
  if (input.durationType === 'custom') {
    if (!durationDays) {
      throw new BadRequestError('durationDays is required for custom membership plans');
    }
  } else {
    durationDays = durationDays || DURATION_DEFAULTS[input.durationType];
  }

  const plan = await MembershipPlanModel.create({
    gymId: new mongoose.Types.ObjectId(input.gymId),
    name: input.name,
    description: input.description,
    durationType: input.durationType,
    durationDays,
    price: input.price,
    currency: input.currency,
    features: input.features,
    includesPersonalTraining: input.includesPersonalTraining,
    status: 'active',
  });

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: plan.gymId,
    action: 'MEMBERSHIP_PLAN_CREATED',
    resourceType: 'MembershipPlan',
    resourceId: plan._id.toString(),
  });

  return toPlanDTO(plan);
}

export async function listPlans(
  actor: AuthActor,
  query: ListPlansQuery
): Promise<{
  plans: MembershipPlanDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const filter: FilterQuery<IMembershipPlan> = { isDeleted: { $ne: true } };

  if (query.gymId) {
    assertGymAccess(actor, query.gymId);
    filter.gymId = new mongoose.Types.ObjectId(query.gymId);
  } else if (actor.role !== 'super_admin') {
    filter.gymId = { $in: actor.gymIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (query.durationType) filter.durationType = query.durationType;
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [plans, total] = await Promise.all([
    MembershipPlanModel.find(filter).sort({ price: 1 }).skip(skip).limit(query.limit),
    MembershipPlanModel.countDocuments(filter),
  ]);

  return {
    plans: plans.map(toPlanDTO),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function updatePlan(
  actor: AuthActor,
  planId: string,
  input: UpdatePlanInput
): Promise<MembershipPlanDTO> {
  const plan = await MembershipPlanModel.findOne({ _id: planId, isDeleted: { $ne: true } });
  if (!plan) {
    throw new NotFoundError('Membership plan not found');
  }

  assertGymAccess(actor, plan.gymId.toString());

  if (input.name !== undefined) plan.name = input.name;
  if (input.description !== undefined) plan.description = input.description;
  if (input.price !== undefined) plan.price = input.price;
  if (input.features !== undefined) plan.features = input.features;
  if (input.includesPersonalTraining !== undefined) {
    plan.includesPersonalTraining = input.includesPersonalTraining;
  }
  if (input.status !== undefined) plan.status = input.status;

  await plan.save();
  return toPlanDTO(plan);
}

export async function createSubscription(
  actor: AuthActor,
  input: CreateSubscriptionInput
): Promise<SubscriptionDTO> {
  assertGymAccess(actor, input.gymId);

  const [plan, member] = await Promise.all([
    MembershipPlanModel.findOne({
      _id: input.planId,
      gymId: input.gymId,
      isDeleted: { $ne: true },
      status: 'active',
    }),
    GymMemberModel.findOne({
      _id: input.memberId,
      gymId: input.gymId,
      isDeleted: { $ne: true },
    }).populate<{ userId: IUser }>('userId'),
  ]);

  if (!plan) {
    throw new NotFoundError('Active membership plan not found in this gym');
  }
  if (!member || !member.userId) {
    throw new NotFoundError('Gym member not found in this gym');
  }

  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const subscription = await SubscriptionModel.create({
    gymId: plan.gymId,
    memberId: member._id,
    userId: member.userId._id,
    planId: plan._id,
    status: 'active',
    startDate,
    endDate,
    autoRenew: input.autoRenew,
    renewalCount: 0,
  });

  if (member.status !== 'active') {
    member.status = 'active';
    await member.save();
  }

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: plan.gymId,
    action: 'SUBSCRIPTION_CREATED',
    resourceType: 'Subscription',
    resourceId: subscription._id.toString(),
  });

  return toSubscriptionDTO(
    subscription,
    plan,
    member as unknown as IGymMember & { userId: IUser }
  );
}

export async function listSubscriptions(
  actor: AuthActor,
  query: ListSubscriptionsQuery
): Promise<{
  subscriptions: SubscriptionDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const filter: FilterQuery<ISubscription> = { isDeleted: { $ne: true } };

  if (query.gymId) {
    assertGymAccess(actor, query.gymId);
    filter.gymId = new mongoose.Types.ObjectId(query.gymId);
  } else if (actor.role !== 'super_admin') {
    filter.gymId = { $in: actor.gymIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (actor.role === 'member') {
    filter.userId = new mongoose.Types.ObjectId(actor.userId);
  } else if (query.memberId) {
    filter.memberId = new mongoose.Types.ObjectId(query.memberId);
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.expiringWithinDays) {
    const now = new Date();
    const horizon = new Date(now.getTime() + query.expiringWithinDays * 24 * 60 * 60 * 1000);
    filter.status = 'active';
    filter.endDate = { $gte: now, $lte: horizon };
  }

  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    SubscriptionModel.find(filter)
      .sort({ endDate: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate<{ planId: IMembershipPlan }>('planId')
      .populate<{ memberId: IGymMember & { userId: IUser } }>({
        path: 'memberId',
        populate: { path: 'userId' },
      }),
    SubscriptionModel.countDocuments(filter),
  ]);

  const subscriptions = records.map((r) =>
    toSubscriptionDTO(
      r as unknown as ISubscription,
      r.planId,
      r.memberId
    )
  );

  return {
    subscriptions,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function updateSubscription(
  actor: AuthActor,
  subscriptionId: string,
  input: UpdateSubscriptionInput
): Promise<SubscriptionDTO> {
  const subscription = await SubscriptionModel.findOne({
    _id: subscriptionId,
    isDeleted: { $ne: true },
  });
  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  assertGymAccess(actor, subscription.gymId.toString());

  const [plan, member] = await Promise.all([
    MembershipPlanModel.findById(subscription.planId),
    GymMemberModel.findById(subscription.memberId).populate<{ userId: IUser }>('userId'),
  ]);

  if (!plan || !member) {
    throw new NotFoundError('Linked plan or member not found');
  }

  if (input.autoRenew !== undefined) {
    subscription.autoRenew = input.autoRenew;
  }

  if (input.action === 'renew') {
    const baseDate =
      subscription.endDate.getTime() > Date.now() ? subscription.endDate : new Date();
    subscription.endDate = new Date(
      baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
    );
    subscription.status = 'active';
    subscription.renewalCount += 1;
    subscription.suspendedReason = undefined;
    member.status = 'active';
    await member.save();
  } else if (input.action === 'suspend') {
    subscription.status = 'suspended';
    subscription.suspendedReason = input.reason;
    member.status = 'suspended';
    await member.save();
  } else if (input.action === 'resume') {
    subscription.status = 'active';
    subscription.suspendedReason = undefined;
    member.status = 'active';
    await member.save();
  } else if (input.action === 'cancel') {
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    member.status = 'inactive';
    await member.save();
  } else if (input.action === 'expire') {
    subscription.status = 'expired';
    member.status = 'expired';
    await member.save();
  }

  await subscription.save();

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(actor.userId),
    actorRole: actor.role,
    gymId: subscription.gymId,
    action: `SUBSCRIPTION_${(input.action || 'UPDATED').toUpperCase()}`,
    resourceType: 'Subscription',
    resourceId: subscription._id.toString(),
  });

  return toSubscriptionDTO(
    subscription,
    plan,
    member as unknown as IGymMember & { userId: IUser }
  );
}

