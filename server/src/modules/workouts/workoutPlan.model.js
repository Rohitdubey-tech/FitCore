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
exports.WorkoutPlanModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const planExerciseSchema = new mongoose_1.Schema({
    exerciseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    sets: { type: Number, required: true, min: 1, max: 20 },
    reps: { type: String, required: true, trim: true },
    restSeconds: { type: Number, default: 90, min: 0, max: 600 },
    targetWeightKg: { type: Number, min: 0 },
    notes: { type: String, maxlength: 300 },
}, { _id: false });
const planDaySchema = new mongoose_1.Schema({
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    exercises: [planExerciseSchema],
}, { _id: false });
const workoutPlanSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' },
    createdByUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember' },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    goal: { type: String, enum: shared_types_1.FITNESS_GOALS },
    difficulty: { type: String, enum: shared_types_1.EXPERIENCE_LEVELS, default: 'intermediate' },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    days: [planDaySchema],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'workoutPlans',
});
workoutPlanSchema.index({ gymId: 1, assignedMemberId: 1, status: 1 });
workoutPlanSchema.index({ createdByUserId: 1, status: 1 });
exports.WorkoutPlanModel = mongoose_1.default.model('WorkoutPlan', workoutPlanSchema);
