import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuthResponseDTO, UserProfileDTO } from '@fitcore/shared-types';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import {
  generateRandomToken,
  hashToken,
  parseDurationToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { IUser, UserModel } from '../users/user.model';
import { RefreshTokenModel } from './refreshToken.model';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schema';

interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
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

async function issueAuthSession(
  user: IUser,
  meta: SessionMetadata,
  existingFamilyId?: string
): Promise<AuthResponseDTO> {
  const jti = crypto.randomUUID();
  const familyId = existingFamilyId || crypto.randomUUID();

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    gymIds: user.gymIds.map((id) => id.toString()),
    activeGymId: user.activeGymId?.toString(),
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    jti,
    familyId,
  });

  const refreshExpiresMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    jti,
    familyId,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: new Date(Date.now() + refreshExpiresMs),
  });

  return {
    user: user.toProfileDTO(),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  };
}

export async function registerUser(
  input: RegisterInput,
  meta: SessionMetadata
): Promise<AuthResponseDTO & { verificationToken?: string }> {
  const existing = await UserModel.findOne({ email: input.email, isDeleted: { $ne: true } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const rawVerificationToken = generateRandomToken(24);

  const user = new UserModel({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    passwordHash,
    role: input.role,
    status: 'active',
    isEmailVerified: false,
    emailVerificationTokenHash: hashToken(rawVerificationToken),
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    gymIds: [],
  });

  if (input.role === 'gym_admin' && input.gymName) {
    const gym = await GymModel.create({
      ownerId: user._id,
      name: input.gymName,
      slug: slugify(input.gymName),
      contactEmail: input.email,
      contactPhone: input.phone || '0000000000',
      status: 'active',
      subscriptionTier: 'starter',
    });
    user.gymIds.push(gym._id);
    user.activeGymId = gym._id;
  }

  await user.save();

  await AuditLogModel.create({
    actorId: user._id,
    actorRole: user.role,
    gymId: user.activeGymId,
    action: 'USER_REGISTERED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const session = await issueAuthSession(user, meta);

  return {
    ...session,
    ...(env.NODE_ENV !== 'production' ? { verificationToken: rawVerificationToken } : {}),
  };
}

export async function loginUser(
  input: LoginInput,
  meta: SessionMetadata
): Promise<AuthResponseDTO> {
  const user = await UserModel.findOne({
    email: input.email,
    isDeleted: { $ne: true },
  }).select('+passwordHash');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'suspended' || user.status === 'deleted') {
    throw new ForbiddenError('Your account has been suspended or deactivated');
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  await AuditLogModel.create({
    actorId: user._id,
    actorRole: user.role,
    gymId: user.activeGymId,
    action: 'USER_LOGIN',
    resourceType: 'User',
    resourceId: user._id.toString(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return issueAuthSession(user, meta);
}

export async function refreshUserTokens(
  rawRefreshToken: string,
  meta: SessionMetadata
): Promise<AuthResponseDTO> {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await RefreshTokenModel.findOne({ tokenHash });

  if (!storedToken) {
    throw new UnauthorizedError('Refresh session not found');
  }

  // Reuse detection: if a revoked token is replayed, revoke the entire token family
  if (storedToken.revokedAt) {
    await RefreshTokenModel.updateMany(
      { familyId: storedToken.familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    logger.warn(
      { userId: storedToken.userId.toString(), familyId: storedToken.familyId },
      'Refresh token reuse detected; revoked token family'
    );
    throw new UnauthorizedError('Refresh token reuse detected; please log in again');
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  const user = await UserModel.findOne({
    _id: decoded.sub,
    isDeleted: { $ne: true },
  });

  if (!user || user.status === 'suspended' || user.status === 'deleted') {
    throw new UnauthorizedError('Account unavailable');
  }

  const nextSession = await issueAuthSession(user, meta, storedToken.familyId);
  storedToken.revokedAt = new Date();
  storedToken.replacedByTokenHash = hashToken(nextSession.tokens.refreshToken);
  await storedToken.save();

  return nextSession;
}

export async function logoutUser(
  userId: string,
  options: { refreshToken?: string; allSessions?: boolean },
  meta: SessionMetadata
): Promise<void> {
  if (options.allSessions) {
    await RefreshTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  } else if (options.refreshToken) {
    await RefreshTokenModel.updateOne(
      {
        userId: new mongoose.Types.ObjectId(userId),
        tokenHash: hashToken(options.refreshToken),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );
  }

  await AuditLogModel.create({
    actorId: new mongoose.Types.ObjectId(userId),
    action: options.allSessions ? 'USER_LOGOUT_ALL' : 'USER_LOGOUT',
    resourceType: 'Session',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function requestPasswordReset(
  email: string
): Promise<{ accepted: true; resetToken?: string }> {
  const user = await UserModel.findOne({ email, isDeleted: { $ne: true } });
  if (!user) {
    return { accepted: true };
  }

  const rawToken = generateRandomToken(24);
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  logger.info({ userId: user._id.toString() }, 'Password reset token generated');

  return {
    accepted: true,
    ...(env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
  };
}

export async function resetUserPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await UserModel.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    isDeleted: { $ne: true },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    throw new BadRequestError('Invalid or expired password reset token');
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );

  await AuditLogModel.create({
    actorId: user._id,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    resourceType: 'User',
    resourceId: user._id.toString(),
  });
}

export async function verifyUserEmail(token: string): Promise<UserProfileDTO> {
  const tokenHash = hashToken(token);
  const user = await UserModel.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
    isDeleted: { $ne: true },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

  if (!user) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  return user.toProfileDTO();
}

export async function getUserProfile(userId: string): Promise<UserProfileDTO> {
  const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new NotFoundError('User profile not found');
  }
  return user.toProfileDTO();
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserProfileDTO> {
  const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
  if (input.notificationPreferences) {
    user.notificationPreferences = {
      email: input.notificationPreferences.email ?? user.notificationPreferences.email,
      push: input.notificationPreferences.push ?? user.notificationPreferences.push,
      inApp: input.notificationPreferences.inApp ?? user.notificationPreferences.inApp,
    };
  }

  await user.save();
  return user.toProfileDTO();
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.status = 'deleted';
  await user.save();

  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );

  await AuditLogModel.create({
    actorId: user._id,
    actorRole: user.role,
    action: 'ACCOUNT_DELETED',
    resourceType: 'User',
    resourceId: user._id.toString(),
  });
}

