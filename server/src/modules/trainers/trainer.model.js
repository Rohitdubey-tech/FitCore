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
exports.TrainerModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const scheduleSlotSchema = new mongoose_1.Schema({
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
}, { _id: false });
const trainerSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    specializations: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 1 },
    bio: { type: String, maxlength: 1000 },
    hourlyRate: { type: Number, min: 0 },
    schedule: [scheduleSlotSchema],
    status: {
        type: String,
        enum: shared_types_1.TRAINER_STATUSES,
        default: 'active',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'trainers',
});
trainerSchema.index({ gymId: 1, userId: 1 }, { unique: true });
trainerSchema.index({ gymId: 1, status: 1 });
exports.TrainerModel = mongoose_1.default.model('Trainer', trainerSchema);
