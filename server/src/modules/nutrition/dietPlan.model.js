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
exports.DietPlanModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const mealItemSchema = new mongoose_1.Schema({
    foodItemId: { type: String },
    name: { type: String, required: true },
    quantityLabel: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    proteinGrams: { type: Number, required: true, min: 0 },
    carbsGrams: { type: Number, required: true, min: 0 },
    fatsGrams: { type: Number, required: true, min: 0 },
}, { _id: false });
const dietPlanSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym' },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    memberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember' },
    createdByUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    dietaryPreference: { type: String, enum: shared_types_1.DIETARY_PREFERENCES, default: 'vegetarian' },
    dailyTargets: {
        calories: { type: Number, required: true, min: 800 },
        proteinGrams: { type: Number, required: true, min: 20 },
        carbsGrams: { type: Number, required: true, min: 0 },
        fatsGrams: { type: Number, required: true, min: 10 },
        waterMl: { type: Number, default: 3000, min: 500 },
    },
    meals: {
        breakfast: [mealItemSchema],
        lunch: [mealItemSchema],
        dinner: [mealItemSchema],
        snacks: [mealItemSchema],
    },
    isAIGenerated: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, {
    timestamps: true,
    collection: 'dietPlans',
});
dietPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });
dietPlanSchema.index({ gymId: 1, memberId: 1 });
exports.DietPlanModel = mongoose_1.default.model('DietPlan', dietPlanSchema);
