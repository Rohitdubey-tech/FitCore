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
exports.getAttendance = exports.getRevenue = exports.logProgressPhoto = exports.logBodyMetric = exports.getBodyProgress = exports.getWorkouts = exports.getDashboard = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const analyticsService = __importStar(require("./analytics.service"));
exports.getDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await analyticsService.getDashboardAnalytics(req.auth, req.query.gymId);
    return (0, response_1.sendSuccess)(res, data);
});
exports.getWorkouts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const data = await analyticsService.getWorkoutAnalytics(req.auth, days);
    return (0, response_1.sendSuccess)(res, data);
});
exports.getBodyProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await analyticsService.getBodyProgress(req.auth);
    return (0, response_1.sendSuccess)(res, data);
});
exports.logBodyMetric = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const metric = await analyticsService.logBodyMetric(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { metric }, { statusCode: 201, message: 'Body metric recorded' });
});
exports.logProgressPhoto = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const photo = await analyticsService.logProgressPhoto(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { photo }, { statusCode: 201, message: 'Progress photo saved' });
});
exports.getRevenue = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await analyticsService.getRevenueAnalytics(req.auth, req.query.gymId);
    return (0, response_1.sendSuccess)(res, data);
});
exports.getAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const data = await analyticsService.getAttendanceAnalytics(req.auth, req.query.gymId, days);
    return (0, response_1.sendSuccess)(res, data);
});
