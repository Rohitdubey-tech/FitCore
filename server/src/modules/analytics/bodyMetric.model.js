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
exports.BodyMetricModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bodyMetricSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember' },
    recordedAt: { type: Date, required: true, default: Date.now },
    weightKg: { type: Number, required: true, min: 20, max: 400 },
    heightCm: { type: Number, min: 80, max: 260 },
    bmi: { type: Number, min: 8, max: 80 },
    bodyFatPercent: { type: Number, min: 2, max: 70 },
    chestCm: { type: Number, min: 30, max: 250 },
    waistCm: { type: Number, min: 30, max: 250 },
    hipCm: { type: Number, min: 30, max: 250 },
    armCm: { type: Number, min: 15, max: 100 },
    notes: { type: String, maxlength: 500 },
}, {
    timestamps: true,
    collection: 'bodyMetrics',
});
bodyMetricSchema.index({ userId: 1, recordedAt: -1 });
bodyMetricSchema.index({ gymId: 1, userId: 1, recordedAt: -1 });
exports.BodyMetricModel = mongoose_1.default.model('BodyMetric', bodyMetricSchema);
