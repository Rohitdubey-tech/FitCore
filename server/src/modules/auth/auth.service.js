"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshUserTokens = refreshUserTokens;
exports.logoutUser = logoutUser;
exports.requestPasswordReset = requestPasswordReset;
exports.resetUserPassword = resetUserPassword;
exports.verifyUserEmail = verifyUserEmail;
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.deleteUserAccount = deleteUserAccount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
const errors_1 = require("../../utils/errors");
const jwt_1 = require("../../utils/jwt");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const user_model_1 = require("../users/user.model");
const refreshToken_model_1 = require("./refreshToken.model");
function slugify(name) {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    const suffix = crypto_1.default.randomBytes(3).toString('hex');
    return `${base || 'gym'}-${suffix}`;
}
async function issueAuthSession(user, meta, existingFamilyId) {
    const jti = crypto_1.default.randomUUID();
    const familyId = existingFamilyId || crypto_1.default.randomUUID();
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: user._id.toString(),
        role: user.role,
        gymIds: user.gymIds.map((id) => id.toString()),
        activeGymId: user.activeGymId?.toString(),
    });
    const refreshToken = (0, jwt_1.signRefreshToken)({
        sub: user._id.toString(),
        jti,
        familyId,
    });
    const refreshExpiresMs = (0, jwt_1.parseDurationToMs)(env_1.env.JWT_REFRESH_EXPIRES_IN);
    await refreshToken_model_1.RefreshTokenModel.create({
        userId: user._id,
        tokenHash: (0, jwt_1.hashToken)(refreshToken),
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
            expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN,
        },
    };
}
async function registerUser(input, meta) {
    const existing = await user_model_1.UserModel.findOne({ email: input.email, isDeleted: { $ne: true } });
    if (existing) {
        throw new errors_1.ConflictError('An account with this email already exists');
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.BCRYPT_ROUNDS);
    const rawVerificationToken = (0, jwt_1.generateRandomToken)(24);
    const user = new user_model_1.UserModel({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
        status: 'active',
        isEmailVerified: false,
        emailVerificationTokenHash: (0, jwt_1.hashToken)(rawVerificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        gymIds: [],
    });
    if (input.role === 'gym_admin' && input.gymName) {
        const gym = await gym_model_1.GymModel.create({
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
    await auditLog_model_1.AuditLogModel.create({
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
        ...(env_1.env.NODE_ENV !== 'production' ? { verificationToken: rawVerificationToken } : {}),
    };
}
async function loginUser(input, meta) {
    const user = await user_model_1.UserModel.findOne({
        email: input.email,
        isDeleted: { $ne: true },
    }).select('+passwordHash');
    if (!user) {
        throw new errors_1.UnauthorizedError('Invalid email or password');
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
        throw new errors_1.ForbiddenError('Your account has been suspended or deactivated');
    }
    const passwordValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    if (!passwordValid) {
        throw new errors_1.UnauthorizedError('Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();
    await auditLog_model_1.AuditLogModel.create({
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
async function refreshUserTokens(rawRefreshToken, meta) {
    let decoded;
    try {
        decoded = (0, jwt_1.verifyRefreshToken)(rawRefreshToken);
    }
    catch {
        throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
    }
    const tokenHash = (0, jwt_1.hashToken)(rawRefreshToken);
    const storedToken = await refreshToken_model_1.RefreshTokenModel.findOne({ tokenHash });
    if (!storedToken) {
        throw new errors_1.UnauthorizedError('Refresh session not found');
    }
    // Reuse detection: if a revoked token is replayed, revoke the entire token family
    if (storedToken.revokedAt) {
        await refreshToken_model_1.RefreshTokenModel.updateMany({ familyId: storedToken.familyId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
        logger_1.logger.warn({ userId: storedToken.userId.toString(), familyId: storedToken.familyId }, 'Refresh token reuse detected; revoked token family');
        throw new errors_1.UnauthorizedError('Refresh token reuse detected; please log in again');
    }
    if (storedToken.expiresAt.getTime() < Date.now()) {
        throw new errors_1.UnauthorizedError('Refresh token expired');
    }
    const user = await user_model_1.UserModel.findOne({
        _id: decoded.sub,
        isDeleted: { $ne: true },
    });
    if (!user || user.status === 'suspended' || user.status === 'deleted') {
        throw new errors_1.UnauthorizedError('Account unavailable');
    }
    const nextSession = await issueAuthSession(user, meta, storedToken.familyId);
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = (0, jwt_1.hashToken)(nextSession.tokens.refreshToken);
    await storedToken.save();
    return nextSession;
}
async function logoutUser(userId, options, meta) {
    if (options.allSessions) {
        await refreshToken_model_1.RefreshTokenModel.updateMany({ userId: new mongoose_1.default.Types.ObjectId(userId), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    }
    else if (options.refreshToken) {
        await refreshToken_model_1.RefreshTokenModel.updateOne({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            tokenHash: (0, jwt_1.hashToken)(options.refreshToken),
            revokedAt: { $exists: false },
        }, { $set: { revokedAt: new Date() } });
    }
    await auditLog_model_1.AuditLogModel.create({
        actorId: new mongoose_1.default.Types.ObjectId(userId),
        action: options.allSessions ? 'USER_LOGOUT_ALL' : 'USER_LOGOUT',
        resourceType: 'Session',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
    });
}
async function requestPasswordReset(email) {
    const user = await user_model_1.UserModel.findOne({ email, isDeleted: { $ne: true } });
    if (!user) {
        return { accepted: true };
    }
    const rawToken = (0, jwt_1.generateRandomToken)(24);
    user.passwordResetTokenHash = (0, jwt_1.hashToken)(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    logger_1.logger.info({ userId: user._id.toString() }, 'Password reset token generated');
    return {
        accepted: true,
        ...(env_1.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
    };
}
async function resetUserPassword(token, newPassword) {
    const tokenHash = (0, jwt_1.hashToken)(token);
    const user = await user_model_1.UserModel.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
        isDeleted: { $ne: true },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) {
        throw new errors_1.BadRequestError('Invalid or expired password reset token');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, env_1.env.BCRYPT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await refreshToken_model_1.RefreshTokenModel.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    await auditLog_model_1.AuditLogModel.create({
        actorId: user._id,
        actorRole: user.role,
        action: 'PASSWORD_RESET',
        resourceType: 'User',
        resourceId: user._id.toString(),
    });
}
async function verifyUserEmail(token) {
    const tokenHash = (0, jwt_1.hashToken)(token);
    const user = await user_model_1.UserModel.findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
        isDeleted: { $ne: true },
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
    if (!user) {
        throw new errors_1.BadRequestError('Invalid or expired verification token');
    }
    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return user.toProfileDTO();
}
async function getUserProfile(userId) {
    const user = await user_model_1.UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
        throw new errors_1.NotFoundError('User profile not found');
    }
    return user.toProfileDTO();
}
async function updateUserProfile(userId, input) {
    const user = await user_model_1.UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
        throw new errors_1.NotFoundError('User profile not found');
    }
    if (input.firstName !== undefined)
        user.firstName = input.firstName;
    if (input.lastName !== undefined)
        user.lastName = input.lastName;
    if (input.phone !== undefined)
        user.phone = input.phone;
    if (input.avatarUrl !== undefined)
        user.avatarUrl = input.avatarUrl;
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
async function deleteUserAccount(userId) {
    const user = await user_model_1.UserModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.status = 'deleted';
    await user.save();
    await refreshToken_model_1.RefreshTokenModel.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    await auditLog_model_1.AuditLogModel.create({
        actorId: user._id,
        actorRole: user.role,
        action: 'ACCOUNT_DELETED',
        resourceType: 'User',
        resourceId: user._id.toString(),
    });
}
