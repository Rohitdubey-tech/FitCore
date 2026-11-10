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
exports.deleteMember = exports.updateMember = exports.getMember = exports.listGymMembers = exports.createGymMember = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const memberService = __importStar(require("./member.service"));
exports.createGymMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const member = await memberService.createGymMember(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { member }, { statusCode: 201, message: 'Member registered successfully' });
});
exports.listGymMembers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await memberService.listGymMembers(req.auth, req.params.id, req.query);
    return (0, response_1.sendSuccess)(res, { members: result.members }, { meta: result.meta });
});
exports.getMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const member = await memberService.getMemberById(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { member });
});
exports.updateMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const member = await memberService.updateMember(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { member }, { message: 'Member updated successfully' });
});
exports.deleteMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await memberService.deleteMember(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { deleted: true }, { message: 'Member removed from gym' });
});
