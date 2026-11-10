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
exports.assignMembers = exports.updateTrainer = exports.getTrainer = exports.listTrainers = exports.createTrainer = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const trainerService = __importStar(require("./trainer.service"));
exports.createTrainer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const trainer = await trainerService.createTrainer(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { trainer }, { statusCode: 201, message: 'Trainer added successfully' });
});
exports.listTrainers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await trainerService.listTrainers(req.auth, req.params.id, req.query);
    return (0, response_1.sendSuccess)(res, { trainers: result.trainers }, { meta: result.meta });
});
exports.getTrainer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const trainer = await trainerService.getTrainerById(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { trainer });
});
exports.updateTrainer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const trainer = await trainerService.updateTrainer(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { trainer }, { message: 'Trainer updated successfully' });
});
exports.assignMembers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await trainerService.assignMembersToTrainer(req.auth, req.params.id, req.body.memberIds);
    return (0, response_1.sendSuccess)(res, result, { message: 'Assigned members updated' });
});
