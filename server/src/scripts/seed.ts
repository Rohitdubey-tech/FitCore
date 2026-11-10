import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { GymModel } from '../modules/gyms/gym.model';
import { GymMemberModel } from '../modules/members/gymMember.model';
import { UserModel } from '../modules/users/user.model';

async function seed() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Development seed script must not be executed in production');
  }

  await connectDatabase();

  const passwordHash = await bcrypt.hash('FitCore@2026', env.BCRYPT_ROUNDS);

  const superAdmin = await UserModel.findOneAndUpdate(
    { email: 'superadmin@fitcore.dev' },
    {
      firstName: 'Aarav',
      lastName: 'Mehta',
      email: 'superadmin@fitcore.dev',
      passwordHash,
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true,
      isDeleted: false,
    },
    { upsert: true, new: true }
  );

  const gymOwner = await UserModel.findOneAndUpdate(
    { email: 'owner@ironpulse.dev' },
    {
      firstName: 'Vikram',
      lastName: 'Sharma',
      email: 'owner@ironpulse.dev',
      phone: '+919876543210',
      passwordHash,
      role: 'gym_admin',
      status: 'active',
      isEmailVerified: true,
      isDeleted: false,
    },
    { upsert: true, new: true }
  );

  const gym = await GymModel.findOneAndUpdate(
    { slug: 'iron-pulse-bengaluru' },
    {
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
    },
    { upsert: true, new: true }
  );

  if (!gymOwner.gymIds.some((id) => id.equals(gym._id))) {
    gymOwner.gymIds.push(gym._id);
    gymOwner.activeGymId = gym._id;
    await gymOwner.save();
  }

  const trainer = await UserModel.findOneAndUpdate(
    { email: 'trainer@ironpulse.dev' },
    {
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
    },
    { upsert: true, new: true }
  );

  const member = await UserModel.findOneAndUpdate(
    { email: 'member@ironpulse.dev' },
    {
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
    },
    { upsert: true, new: true }
  );

  await GymMemberModel.findOneAndUpdate(
    { gymId: gym._id, userId: member._id },
    {
      gymId: gym._id,
      branchId: gym.branches[0]?._id,
      userId: member._id,
      membershipCode: 'IP-2026-0001',
      status: 'active',
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      isDeleted: false,
    },
    { upsert: true, new: true }
  );

  logger.info(
    {
      superAdmin: superAdmin.email,
      gymOwner: gymOwner.email,
      trainer: trainer.email,
      member: member.email,
      gym: gym.slug,
    },
    'FITCORE development seed complete'
  );

  await disconnectDatabase();
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});

