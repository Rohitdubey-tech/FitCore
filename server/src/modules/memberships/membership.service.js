"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlan = createPlan;
exports.listPlans = listPlans;
exports.updatePlan = updatePlan;
exports.createSubscription = createSubscription;
exports.listSubscriptions = listSubscriptions;
exports.updateSubscription = updateSubscription;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../../utils/errors");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const gymMember_model_1 = require("../members/gymMember.model");
const membershipPlan_model_1 = require("./membershipPlan.model");
const subscription_model_1 = require("./subscription.model");
const DURATION_DEFAULTS = {
    monthly: 30,
    quarterly: 90,
    half_yearly: 180,
    annual: 365,
};
function assertGymAccess(actor, gymId) {
    if (actor.role === 'super_admin')
        return;
    if (!actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
}
function toPlanDTO(plan) {
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
function toSubscriptionDTO(sub, plan, member) {
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
async function createPlan(actor, input) {
    assertGymAccess(actor, input.gymId);
    const gymExists = await gym_model_1.GymModel.exists({ _id: input.gymId, isDeleted: { $ne: true } });
    if (!gymExists) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    let durationDays = input.durationDays;
    if (input.durationType === 'custom') {
        if (!durationDays) {
            throw new errors_1.BadRequestError('durationDays is required for custom membership plans');
        }
    }
    else {
        durationDays = durationDays || DURATION_DEFAULTS[input.durationType];
    }
    const plan = await membershipPlan_model_1.MembershipPlanModel.create({
        gymId: new mongoose_1.default.Types.ObjectId(input.gymId),
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
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: plan.gymId,
        action: 'MEMBERSHIP_PLAN_CREATED',
        resourceType: 'MembershipPlan',
        resourceId: plan._id.toString(),
    });
    return toPlanDTO(plan);
}
async function listPlans(actor, query) {
    const filter = { isDeleted: { $ne: true } };
    if (query.gymId) {
        assertGymAccess(actor, query.gymId);
        filter.gymId = new mongoose_1.default.Types.ObjectId(query.gymId);
    }
    else if (actor.role !== 'super_admin') {
        filter.gymId = { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) };
    }
    if (query.durationType)
        filter.durationType = query.durationType;
    if (query.status)
        filter.status = query.status;
    const skip = (query.page - 1) * query.limit;
    const [plans, total] = await Promise.all([
        membershipPlan_model_1.MembershipPlanModel.find(filter).sort({ price: 1 }).skip(skip).limit(query.limit),
        membershipPlan_model_1.MembershipPlanModel.countDocuments(filter),
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
async function updatePlan(actor, planId, input) {
    const plan = await membershipPlan_model_1.MembershipPlanModel.findOne({ _id: planId, isDeleted: { $ne: true } });
    if (!plan) {
        throw new errors_1.NotFoundError('Membership plan not found');
    }
    assertGymAccess(actor, plan.gymId.toString());
    if (input.name !== undefined)
        plan.name = input.name;
    if (input.description !== undefined)
        plan.description = input.description;
    if (input.price !== undefined)
        plan.price = input.price;
    if (input.features !== undefined)
        plan.features = input.features;
    if (input.includesPersonalTraining !== undefined) {
        plan.includesPersonalTraining = input.includesPersonalTraining;
    }
    if (input.status !== undefined)
        plan.status = input.status;
    await plan.save();
    return toPlanDTO(plan);
}
async function createSubscription(actor, input) {
    assertGymAccess(actor, input.gymId);
    const [plan, member] = await Promise.all([
        membershipPlan_model_1.MembershipPlanModel.findOne({
            _id: input.planId,
            gymId: input.gymId,
            isDeleted: { $ne: true },
            status: 'active',
        }),
        gymMember_model_1.GymMemberModel.findOne({
            _id: input.memberId,
            gymId: input.gymId,
            isDeleted: { $ne: true },
        }).populate('userId'),
    ]);
    if (!plan) {
        throw new errors_1.NotFoundError('Active membership plan not found in this gym');
    }
    if (!member || !member.userId) {
        throw new errors_1.NotFoundError('Gym member not found in this gym');
    }
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const subscription = await subscription_model_1.SubscriptionModel.create({
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
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: plan.gymId,
        action: 'SUBSCRIPTION_CREATED',
        resourceType: 'Subscription',
        resourceId: subscription._id.toString(),
    });
    return toSubscriptionDTO(subscription, plan, member);
}
async function listSubscriptions(actor, query) {
    const filter = { isDeleted: { $ne: true } };
    if (query.gymId) {
        assertGymAccess(actor, query.gymId);
        filter.gymId = new mongoose_1.default.Types.ObjectId(query.gymId);
    }
    else if (actor.role !== 'super_admin') {
        filter.gymId = { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) };
    }
    if (actor.role === 'member') {
        filter.userId = new mongoose_1.default.Types.ObjectId(actor.userId);
    }
    else if (query.memberId) {
        filter.memberId = new mongoose_1.default.Types.ObjectId(query.memberId);
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
        subscription_model_1.SubscriptionModel.find(filter)
            .sort({ endDate: 1 })
            .skip(skip)
            .limit(query.limit)
            .populate('planId')
            .populate({
            path: 'memberId',
            populate: { path: 'userId' },
        }),
        subscription_model_1.SubscriptionModel.countDocuments(filter),
    ]);
    const subscriptions = records.map((r) => toSubscriptionDTO(r, r.planId, r.memberId));
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
async function updateSubscription(actor, subscriptionId, input) {
    const subscription = await subscription_model_1.SubscriptionModel.findOne({
        _id: subscriptionId,
        isDeleted: { $ne: true },
    });
    if (!subscription) {
        throw new errors_1.NotFoundError('Subscription not found');
    }
    assertGymAccess(actor, subscription.gymId.toString());
    const [plan, member] = await Promise.all([
        membershipPlan_model_1.MembershipPlanModel.findById(subscription.planId),
        gymMember_model_1.GymMemberModel.findById(subscription.memberId).populate('userId'),
    ]);
    if (!plan || !member) {
        throw new errors_1.NotFoundError('Linked plan or member not found');
    }
    if (input.autoRenew !== undefined) {
        subscription.autoRenew = input.autoRenew;
    }
    if (input.action === 'renew') {
        const baseDate = subscription.endDate.getTime() > Date.now() ? subscription.endDate : new Date();
        subscription.endDate = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        subscription.status = 'active';
        subscription.renewalCount += 1;
        subscription.suspendedReason = undefined;
        member.status = 'active';
        await member.save();
    }
    else if (input.action === 'suspend') {
        subscription.status = 'suspended';
        subscription.suspendedReason = input.reason;
        member.status = 'suspended';
        await member.save();
    }
    else if (input.action === 'resume') {
        subscription.status = 'active';
        subscription.suspendedReason = undefined;
        member.status = 'active';
        await member.save();
    }
    else if (input.action === 'cancel') {
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        member.status = 'inactive';
        await member.save();
    }
    else if (input.action === 'expire') {
        subscription.status = 'expired';
        member.status = 'expired';
        await member.save();
    }
    await subscription.save();
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: subscription.gymId,
        action: `SUBSCRIPTION_${(input.action || 'UPDATED').toUpperCase()}`,
        resourceType: 'Subscription',
        resourceId: subscription._id.toString(),
    });
    return toSubscriptionDTO(subscription, plan, member);
}
