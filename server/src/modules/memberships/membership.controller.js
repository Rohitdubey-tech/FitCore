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
exports.updateSubscription = exports.listSubscriptions = exports.createSubscription = exports.updatePlan = exports.listPlans = exports.createPlan = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const membershipService = __importStar(require("./membership.service"));
exports.createPlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const plan = await membershipService.createPlan(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { plan }, { statusCode: 201, message: 'Membership plan created' });
});
exports.listPlans = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await membershipService.listPlans(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { plans: result.plans }, { meta: result.meta });
});
exports.updatePlan = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const plan = await membershipService.updatePlan(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { plan }, { message: 'Membership plan updated' });
});
exports.createSubscription = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const subscription = await membershipService.createSubscription(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { subscription }, { statusCode: 201, message: 'Subscription activated' });
});
exports.listSubscriptions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await membershipService.listSubscriptions(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { subscriptions: result.subscriptions }, { meta: result.meta });
});
exports.updateSubscription = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const subscription = await membershipService.updateSubscription(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { subscription }, { message: 'Subscription updated' });
});
