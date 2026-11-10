"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const gym_model_1 = require("../modules/gyms/gym.model");
const gymMember_model_1 = require("../modules/members/gymMember.model");
const user_model_1 = require("../modules/users/user.model");
async function seed() {
    if (env_1.env.NODE_ENV === 'production') {
        throw new Error('Development seed script must not be executed in production');
    }
    await (0, database_1.connectDatabase)();
    const passwordHash = await bcryptjs_1.default.hash('FitCore@2026', env_1.env.BCRYPT_ROUNDS);
    const superAdmin = await user_model_1.UserModel.findOneAndUpdate({ email: 'superadmin@fitcore.dev' }, {
        firstName: 'Aarav',
        lastName: 'Mehta',
        email: 'superadmin@fitcore.dev',
        passwordHash,
        role: 'super_admin',
        status: 'active',
        isEmailVerified: true,
        isDeleted: false,
    }, { upsert: true, new: true });
    const gymOwner = await user_model_1.UserModel.findOneAndUpdate({ email: 'owner@ironpulse.dev' }, {
        firstName: 'Vikram',
        lastName: 'Sharma',
        email: 'owner@ironpulse.dev',
        phone: '+919876543210',
        passwordHash,
        role: 'gym_admin',
        status: 'active',
        isEmailVerified: true,
        isDeleted: false,
    }, { upsert: true, new: true });
    const gym = await gym_model_1.GymModel.findOneAndUpdate({ slug: 'iron-pulse-bengaluru' }, {
        ownerId: gymOwner._id,
        name: 'Iron Pulse Performance Club',
        slug: 'iron-pulse-bengaluru',
        description: 'Flagship strength, hypertrophy, and conditioning facility.',
        contactEmail: 'owner@ironpulse.dev',
        contactPhone: '+919876543210',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        status: 'active',
        subscriptionTier: 'growth',
        branches: [
            {
                name: 'Indiranagar HQ',
                address: '100 Feet Road, HAL 2nd Stage',
                city: 'Bengaluru',
                state: 'Karnataka',
                postalCode: '560038',
                phone: '+919876543210',
                isPrimary: true,
            },
        ],
        isDeleted: false,
    }, { upsert: true, new: true });
    if (!gymOwner.gymIds.some((id) => id.equals(gym._id))) {
        gymOwner.gymIds.push(gym._id);
        gymOwner.activeGymId = gym._id;
        await gymOwner.save();
    }
    const trainer = await user_model_1.UserModel.findOneAndUpdate({ email: 'trainer@ironpulse.dev' }, {
        firstName: 'Rohan',
        lastName: 'Kapoor',
        email: 'trainer@ironpulse.dev',
        passwordHash,
        role: 'trainer',
        status: 'active',
        isEmailVerified: true,
        gymIds: [gym._id],
        activeGymId: gym._id,
        isDeleted: false,
    }, { upsert: true, new: true });
    const member = await user_model_1.UserModel.findOneAndUpdate({ email: 'member@ironpulse.dev' }, {
        firstName: 'Ananya',
        lastName: 'Nair',
        email: 'member@ironpulse.dev',
        passwordHash,
        role: 'member',
        status: 'active',
        isEmailVerified: true,
        gymIds: [gym._id],
        activeGymId: gym._id,
        isDeleted: false,
    }, { upsert: true, new: true });
    await gymMember_model_1.GymMemberModel.findOneAndUpdate({ gymId: gym._id, userId: member._id }, {
        gymId: gym._id,
        branchId: gym.branches[0]?._id,
        userId: member._id,
        membershipCode: 'IP-2026-0001',
        status: 'active',
        fitnessGoal: 'muscle_gain',
        experienceLevel: 'intermediate',
        isDeleted: false,
    }, { upsert: true, new: true });
    logger_1.logger.info({
        superAdmin: superAdmin.email,
        gymOwner: gymOwner.email,
        trainer: trainer.email,
        member: member.email,
        gym: gym.slug,
    }, 'FITCORE development seed complete');
    await (0, database_1.disconnectDatabase)();
}
seed().catch((err) => {
    logger_1.logger.error({ err }, 'Seed failed');
    process.exit(1);
});
