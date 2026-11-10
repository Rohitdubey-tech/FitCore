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
exports.MembershipPlanModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const membershipPlanSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    durationType: {
        type: String,
        enum: shared_types_1.PLAN_DURATION_TYPES,
        required: true,
    },
    durationDays: { type: Number, required: true, min: 1, max: 3650 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    features: [{ type: String, trim: true }],
    includesPersonalTraining: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'membershipPlans',
});
membershipPlanSchema.index({ gymId: 1, status: 1 });
exports.MembershipPlanModel = mongoose_1.default.model('MembershipPlan', membershipPlanSchema);
