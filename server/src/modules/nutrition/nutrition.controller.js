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
exports.deleteFoodLog = exports.getDailySummary = exports.createFoodLog = exports.listDietPlans = exports.createDietPlan = exports.searchFoods = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const nutritionService = __importStar(require("./nutrition.service"));
exports.searchFoods = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await nutritionService.searchFoods(req.query);
    return (0, response_1.sendSuccess)(res, { foods: result.foods }, { meta: result.meta });
});
exports.createDietPlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dietPlan = await nutritionService.createDietPlan(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { dietPlan }, { statusCode: 201, message: 'Diet plan saved' });
});
exports.listDietPlans = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dietPlans = await nutritionService.listDietPlans(req.auth);
    return (0, response_1.sendSuccess)(res, { dietPlans });
});
exports.createFoodLog = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const foodLog = await nutritionService.logFoodOrWater(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { foodLog }, { statusCode: 201, message: 'Intake logged' });
});
exports.getDailySummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const summary = await nutritionService.getDailyNutritionSummary(req.auth, req.query.dateKey);
    return (0, response_1.sendSuccess)(res, { summary });
});
exports.deleteFoodLog = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await nutritionService.deleteFoodLog(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { deleted: true }, { message: 'Entry removed' });
});
