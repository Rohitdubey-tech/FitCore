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
exports.trainerRoutes = exports.gymTrainersRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const gym_schema_1 = require("../gyms/gym.schema");
const trainerController = __importStar(require("./trainer.controller"));
const trainer_schema_1 = require("./trainer.schema");
const gymScopedRouter = (0, express_1.Router)({ mergeParams: true });
exports.gymTrainersRoutes = gymScopedRouter;
gymScopedRouter.use(auth_1.authenticate);
gymScopedRouter.post('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: gym_schema_1.gymIdParamSchema, body: trainer_schema_1.createTrainerSchema }), trainerController.createTrainer);
gymScopedRouter.get('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer', 'member'), (0, validate_1.validate)({ params: gym_schema_1.gymIdParamSchema, query: trainer_schema_1.listTrainersQuerySchema }), trainerController.listTrainers);
const trainerRouter = (0, express_1.Router)();
exports.trainerRoutes = trainerRouter;
trainerRouter.use(auth_1.authenticate);
trainerRouter.get('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer'), (0, validate_1.validate)({ params: trainer_schema_1.trainerIdParamSchema }), trainerController.getTrainer);
trainerRouter.patch('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer'), (0, validate_1.validate)({ params: trainer_schema_1.trainerIdParamSchema, body: trainer_schema_1.updateTrainerSchema }), trainerController.updateTrainer);
trainerRouter.post('/:id/assign-members', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: trainer_schema_1.trainerIdParamSchema, body: trainer_schema_1.assignMembersSchema }), trainerController.assignMembers);
