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
exports.GymModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const branchSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
}, { _id: true });
const gymSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 1000 },
    logoUrl: { type: String },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    operatingHours: [
        {
            day: { type: String, required: true },
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
    ],
    branches: [branchSchema],
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active',
    },
    subscriptionTier: {
        type: String,
        enum: ['starter', 'growth', 'enterprise'],
        default: 'starter',
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    collection: 'gyms',
});
gymSchema.index({ ownerId: 1 });
gymSchema.index({ status: 1, isDeleted: 1 });
exports.GymModel = mongoose_1.default.model('Gym', gymSchema);
