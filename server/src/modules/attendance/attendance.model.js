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
exports.AttendanceModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const attendanceSchema = new mongoose_1.Schema({
    gymId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Gym', required: true },
    branchId: { type: mongoose_1.Schema.Types.ObjectId },
    memberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GymMember', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkInAt: { type: Date, required: true, default: Date.now },
    checkOutAt: { type: Date },
    method: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    status: { type: String, enum: ['checked_in', 'checked_out'], default: 'checked_in' },
}, {
    timestamps: true,
    collection: 'attendance',
});
attendanceSchema.index({ gymId: 1, dateKey: 1, memberId: 1 });
attendanceSchema.index({ userId: 1, dateKey: -1 });
exports.AttendanceModel = mongoose_1.default.model('Attendance', attendanceSchema);
