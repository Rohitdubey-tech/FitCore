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
exports.getWorkoutHistory = exports.updateWorkoutSession = exports.logWorkoutSession = exports.updateWorkoutPlan = exports.getWorkoutPlan = exports.listWorkoutPlans = exports.createWorkoutPlan = exports.createExercise = exports.listExercises = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const workoutService = __importStar(require("./workout.service"));
exports.listExercises = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await workoutService.listExercises(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { exercises: result.exercises }, { meta: result.meta });
});
exports.createExercise = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const exercise = await workoutService.createCustomExercise(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { exercise }, { statusCode: 201, message: 'Exercise created' });
});
exports.createWorkoutPlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const workout = await workoutService.createWorkoutPlan(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { workout }, { statusCode: 201, message: 'Workout plan created' });
});
exports.listWorkoutPlans = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await workoutService.listWorkoutPlans(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { workouts: result.workouts }, { meta: result.meta });
});
exports.getWorkoutPlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const workout = await workoutService.getWorkoutPlanById(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { workout });
});
exports.updateWorkoutPlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const workout = await workoutService.updateWorkoutPlan(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { workout }, { message: 'Workout plan updated' });
});
exports.logWorkoutSession = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const session = await workoutService.logWorkoutSession(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { session }, { statusCode: 201, message: 'Workout session logged' });
});
exports.updateWorkoutSession = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const session = await workoutService.updateWorkoutSession(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { session }, { message: 'Workout session updated' });
});
exports.getWorkoutHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await workoutService.getWorkoutHistory(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { sessions: result.sessions, stats: result.stats }, { meta: result.meta });
});
