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
exports.listRecommendations = exports.analyzeMeal = exports.chat = exports.generateWorkout = exports.generateDiet = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const aiService = __importStar(require("./ai.service"));
exports.generateDiet = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await aiService.generateAIDietPlan(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, data, { statusCode: 201, message: 'AI diet plan generated' });
});
exports.generateWorkout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await aiService.generateAIWorkoutPlan(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, data, { statusCode: 201, message: 'AI workout plan generated' });
});
exports.chat = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await aiService.chatWithFitnessAssistant(req.auth, req.body.message);
    return (0, response_1.sendSuccess)(res, data);
});
exports.analyzeMeal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await aiService.analyzeMeal(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, data);
});
exports.listRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const recommendations = await aiService.listRecommendations(req.auth);
    return (0, response_1.sendSuccess)(res, { recommendations });
});
