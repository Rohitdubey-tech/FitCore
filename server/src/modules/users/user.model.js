"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 255,
    },
    phone: { type: String, trim: true, maxlength: 24 },
    avatarUrl: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: shared_types_1.USER_ROLES,
        default: 'member',
        required: true,
    },
    status: {
        type: String,
        enum: shared_types_1.ACCOUNT_STATUSES,
        default: 'active',
        required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    gymIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' }],
    activeGymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' },
    notificationPreferences: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
    },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'users',
});
userSchema.index({ role: 1, status: 1 });
userSchema.index({ gymIds: 1 });
userSchema.index({ isDeleted: 1, email: 1 });
userSchema.methods.toProfileDTO = function toProfileDTO() {
    return {
        id: this._id.toString(),
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        avatarUrl: this.avatarUrl,
        role: this.role,
        status: this.status,
        isEmailVerified: this.isEmailVerified,
        gymIds: this.gymIds.map((id) => id.toString()),
        activeGymId: this.activeGymId?.toString(),
        notificationPreferences: {
            email: this.notificationPreferences?.email ?? true,
            push: this.notificationPreferences?.push ?? true,
            inApp: this.notificationPreferences?.inApp ?? true,
        },
        createdAt: this.createdAt.toISOString(),
        updatedAt: this.updatedAt.toISOString(),
    };
};
exports.UserModel = mongoose_1.default.model('User', userSchema);
