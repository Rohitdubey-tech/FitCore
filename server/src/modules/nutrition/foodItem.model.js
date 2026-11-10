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
exports.FoodItemModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const foodItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    cuisine: { type: String, enum: ['indian', 'international'], required: true },
    dietaryTags: [{ type: String, trim: true }],
    servingSizeGrams: { type: Number, required: true, min: 1 },
    servingLabel: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    proteinGrams: { type: Number, required: true, min: 0 },
    carbsGrams: { type: Number, required: true, min: 0 },
    fatsGrams: { type: Number, required: true, min: 0 },
    fiberGrams: { type: Number, default: 0, min: 0 },
    isVerified: { type: Boolean, default: true },
    source: { type: String, default: 'IFCT_USDA_VERIFIED' },
}, {
    timestamps: true,
    collection: 'foodItems',
});
foodItemSchema.index({ name: 'text' });
foodItemSchema.index({ cuisine: 1, category: 1 });
foodItemSchema.index({ dietaryTags: 1 });
exports.FoodItemModel = mongoose_1.default.model('FoodItem', foodItemSchema);
