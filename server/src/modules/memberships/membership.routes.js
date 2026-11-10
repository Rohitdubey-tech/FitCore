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
exports.subscriptionRoutes = exports.membershipPlanRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const membershipController = __importStar(require("./membership.controller"));
const membership_schema_1 = require("./membership.schema");
const planRouter = (0, express_1.Router)();
exports.membershipPlanRoutes = planRouter;
planRouter.use(auth_1.authenticate);
planRouter.post('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ body: membership_schema_1.createPlanSchema }), membershipController.createPlan);
planRouter.get('/', (0, validate_1.validate)({ query: membership_schema_1.listPlansQuerySchema }), membershipController.listPlans);
planRouter.patch('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: membership_schema_1.resourceIdParamSchema, body: membership_schema_1.updatePlanSchema }), membershipController.updatePlan);
const subscriptionRouter = (0, express_1.Router)();
exports.subscriptionRoutes = subscriptionRouter;
subscriptionRouter.use(auth_1.authenticate);
subscriptionRouter.post('/', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ body: membership_schema_1.createSubscriptionSchema }), membershipController.createSubscription);
subscriptionRouter.get('/', (0, validate_1.validate)({ query: membership_schema_1.listSubscriptionsQuerySchema }), membershipController.listSubscriptions);
subscriptionRouter.patch('/:id', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: membership_schema_1.resourceIdParamSchema, body: membership_schema_1.updateSubscriptionSchema }), membershipController.updateSubscription);
