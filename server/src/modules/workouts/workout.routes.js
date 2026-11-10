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
exports.workoutRoutes = exports.workoutSessionRoutes = exports.exerciseRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const workoutController = __importStar(require("./workout.controller"));
const workout_schema_1 = require("./workout.schema");
const exerciseRouter = (0, express_1.Router)();
exports.exerciseRoutes = exerciseRouter;
exerciseRouter.use(auth_1.authenticate);
exerciseRouter.get('/', (0, validate_1.validate)({ query: workout_schema_1.listExercisesQuerySchema }), workoutController.listExercises);
exerciseRouter.post('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer'), (0, validate_1.validate)({ body: workout_schema_1.createExerciseSchema }), workoutController.createExercise);
const workoutPlanRouter = (0, express_1.Router)();
exports.workoutRoutes = workoutPlanRouter;
workoutPlanRouter.use(auth_1.authenticate);
workoutPlanRouter.post('/', (0, validate_1.validate)({ body: workout_schema_1.createWorkoutPlanSchema }), workoutController.createWorkoutPlan);
workoutPlanRouter.get('/', (0, validate_1.validate)({ query: workout_schema_1.listWorkoutsQuerySchema }), workoutController.listWorkoutPlans);
workoutPlanRouter.get('/:id', (0, validate_1.validate)({ params: workout_schema_1.workoutIdParamSchema }), workoutController.getWorkoutPlan);
workoutPlanRouter.patch('/:id', (0, validate_1.validate)({ params: workout_schema_1.workoutIdParamSchema, body: workout_schema_1.updateWorkoutPlanSchema }), workoutController.updateWorkoutPlan);
const sessionRouter = (0, express_1.Router)();
exports.workoutSessionRoutes = sessionRouter;
sessionRouter.use(auth_1.authenticate);
sessionRouter.post('/', (0, validate_1.validate)({ body: workout_schema_1.createWorkoutSessionSchema }), workoutController.logWorkoutSession);
sessionRouter.get('/history', (0, validate_1.validate)({ query: workout_schema_1.listSessionsQuerySchema }), workoutController.getWorkoutHistory);
sessionRouter.patch('/:id', (0, validate_1.validate)({ params: workout_schema_1.workoutIdParamSchema, body: workout_schema_1.updateWorkoutSessionSchema }), workoutController.updateWorkoutSession);
