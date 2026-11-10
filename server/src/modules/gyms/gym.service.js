"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGymDTO = toGymDTO;
exports.createGym = createGym;
exports.listGyms = listGyms;
exports.getGymById = getGymById;
exports.updateGym = updateGym;
exports.deleteGym = deleteGym;
exports.switchActiveGym = switchActiveGym;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../../utils/errors");
const auditLog_model_1 = require("../audit/auditLog.model");
const user_model_1 = require("../users/user.model");
const gym_model_1 = require("./gym.model");
const DEFAULT_OPERATING_HOURS = [
    { day: 'Monday', open: '05:30', close: '22:30', isClosed: false },
    { day: 'Tuesday', open: '05:30', close: '22:30', isClosed: false },
    { day: 'Wednesday', open: '05:30', close: '22:30', isClosed: false },
    { day: 'Thursday', open: '05:30', close: '22:30', isClosed: false },
    { day: 'Friday', open: '05:30', close: '22:30', isClosed: false },
    { day: 'Saturday', open: '06:00', close: '21:00', isClosed: false },
    { day: 'Sunday', open: '07:00', close: '18:00', isClosed: false },
];
function slugify(name) {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    const suffix = crypto_1.default.randomBytes(3).toString('hex');
    return `${base || 'gym'}-${suffix}`;
}
function toGymDTO(gym) {
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
async function createGym(actor, input) {
    const gym = await gym_model_1.GymModel.create({
        ownerId: new mongoose_1.default.Types.ObjectId(actor.userId),
        name: input.name,
        slug: slugify(input.name),
        description: input.description,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        website: input.website || undefined,
        timezone: input.timezone,
        currency: input.currency,
        operatingHours: input.operatingHours && input.operatingHours.length > 0
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
    await user_model_1.UserModel.updateOne({ _id: actor.userId }, {
        $addToSet: { gymIds: gym._id },
        $set: { activeGymId: gym._id },
    });
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: gym._id,
        action: 'GYM_CREATED',
        resourceType: 'Gym',
        resourceId: gym._id.toString(),
    });
    return toGymDTO(gym);
}
async function listGyms(actor, query) {
    const filter = { isDeleted: { $ne: true } };
    if (actor.role !== 'super_admin') {
        filter._id = { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) };
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
        gym_model_1.GymModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
        gym_model_1.GymModel.countDocuments(filter),
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
async function getGymById(actor, gymId) {
    if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const gym = await gym_model_1.GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
    if (!gym) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    return toGymDTO(gym);
}
async function updateGym(actor, gymId, input) {
    if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const gym = await gym_model_1.GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
    if (!gym) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    if (input.name !== undefined)
        gym.name = input.name;
    if (input.description !== undefined)
        gym.description = input.description;
    if (input.contactEmail !== undefined)
        gym.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined)
        gym.contactPhone = input.contactPhone;
    if (input.website !== undefined)
        gym.website = input.website || undefined;
    if (input.timezone !== undefined)
        gym.timezone = input.timezone;
    if (input.currency !== undefined)
        gym.currency = input.currency;
    if (input.operatingHours !== undefined)
        gym.operatingHours = input.operatingHours;
    if (input.branches !== undefined) {
        gym.branches = input.branches.map((b) => ({
            _id: b.id ? new mongoose_1.default.Types.ObjectId(b.id) : new mongoose_1.default.Types.ObjectId(),
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
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: gym._id,
        action: 'GYM_UPDATED',
        resourceType: 'Gym',
        resourceId: gym._id.toString(),
    });
    return toGymDTO(gym);
}
async function deleteGym(actor, gymId) {
    if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const gym = await gym_model_1.GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } });
    if (!gym) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    if (actor.role !== 'super_admin' && gym.ownerId.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Only the gym owner or super admin can delete this gym');
    }
    gym.isDeleted = true;
    gym.deletedAt = new Date();
    await gym.save();
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(actor.userId),
        actorRole: actor.role,
        gymId: gym._id,
        action: 'GYM_DELETED',
        resourceType: 'Gym',
        resourceId: gym._id.toString(),
    });
}
async function switchActiveGym(actor, gymId) {
    if (actor.role !== 'super_admin' && !actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
    const gym = await gym_model_1.GymModel.findOne({ _id: gymId, isDeleted: { $ne: true } }).select('_id');
    if (!gym) {
        throw new errors_1.NotFoundError('Gym not found');
    }
    await user_model_1.UserModel.updateOne({ _id: actor.userId }, { $set: { activeGymId: gym._id } });
    return { activeGymId: gym._id.toString() };
}
