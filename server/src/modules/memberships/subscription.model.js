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
exports.SubscriptionModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const subscriptionSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    status: {
        type: String,
        enum: shared_types_1.SUBSCRIPTION_STATUSES,
        default: 'active',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: false },
    renewalCount: { type: Number, default: 0, min: 0 },
    suspendedReason: { type: String, maxlength: 500 },
    cancelledAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'subscriptions',
});
subscriptionSchema.index({ gymId: 1, status: 1, endDate: 1 });
subscriptionSchema.index({ memberId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, status: 1 });
exports.SubscriptionModel = mongoose_1.default.model('Subscription', subscriptionSchema);
