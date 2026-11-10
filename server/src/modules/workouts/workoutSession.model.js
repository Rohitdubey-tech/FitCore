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
exports.WorkoutSessionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const sessionSetSchema = new mongoose_1.Schema({
    setNumber: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: true, min: 0, max: 500 },
    weightKg: { type: Number, required: true, min: 0, max: 1500 },
    rpe: { type: Number, min: 1, max: 10 },
    isCompleted: { type: Boolean, default: true },
    isPersonalRecord: { type: Boolean, default: false },
}, { _id: false });
const sessionExerciseSchema = new mongoose_1.Schema({
    exerciseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    exerciseName: { type: String, required: true },
    sets: [sessionSetSchema],
}, { _id: false });
const workoutSessionSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember' },
    workoutPlanId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'WorkoutPlan' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    durationMinutes: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'completed',
    },
    exercises: [sessionExerciseSchema],
    totalVolumeKg: { type: Number, default: 0, min: 0 },
    personalRecordsHit: { type: Number, default: 0, min: 0 },
    notes: { type: String, maxlength: 1000 },
}, {
    timestamps: true,
    collection: 'workoutSessions',
});
workoutSessionSchema.index({ userId: 1, startedAt: -1 });
workoutSessionSchema.index({ gymId: 1, userId: 1, startedAt: -1 });
exports.WorkoutSessionModel = mongoose_1.default.model('WorkoutSession', workoutSessionSchema);
