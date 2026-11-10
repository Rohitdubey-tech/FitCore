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
exports.GymMemberModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const gymMemberSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTrainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Trainer' },
    membershipCode: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired', 'suspended'],
        default: 'active',
    },
    fitnessGoal: {
        type: String,
        enum: ['fat_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness'],
    },
    experienceLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
    },
    joinedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 1000 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'gymMembers',
});
gymMemberSchema.index({ gymId: 1, userId: 1 }, { unique: true });
gymMemberSchema.index({ gymId: 1, status: 1 });
gymMemberSchema.index({ gymId: 1, assignedTrainerId: 1 });
exports.GymMemberModel = mongoose_1.default.model('GymMember', gymMemberSchema);
