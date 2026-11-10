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
exports.memberRoutes = exports.gymMembersRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const gym_schema_1 = require("../gyms/gym.schema");
const memberController = __importStar(require("./member.controller"));
const member_schema_1 = require("./member.schema");
const gymScopedRouter = (0, express_1.Router)({ mergeParams: true });
exports.gymMembersRoutes = gymScopedRouter;
gymScopedRouter.use(auth_1.authenticate);
gymScopedRouter.post('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: gym_schema_1.gymIdParamSchema, body: member_schema_1.createMemberSchema }), memberController.createGymMember);
gymScopedRouter.get('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin', 'trainer'), (0, validate_1.validate)({ params: gym_schema_1.gymIdParamSchema, query: member_schema_1.listMembersQuerySchema }), memberController.listGymMembers);
const memberRouter = (0, express_1.Router)();
exports.memberRoutes = memberRouter;
memberRouter.use(auth_1.authenticate);
memberRouter.get('/:id', (0, validate_1.validate)({ params: member_schema_1.memberIdParamSchema }), memberController.getMember);
memberRouter.patch('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: member_schema_1.memberIdParamSchema, body: member_schema_1.updateMemberSchema }), memberController.updateMember);
memberRouter.delete('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: member_schema_1.memberIdParamSchema }), memberController.deleteMember);
