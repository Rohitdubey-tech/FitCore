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
exports.paymentRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const paymentController = __importStar(require("./payment.controller"));
const payment_schema_1 = require("./payment.schema");
const router = (0, express_1.Router)();
// Public webhook endpoint authenticated via Razorpay HMAC-SHA256 signature
router.post('/webhook', paymentController.handleWebhook);
router.use(auth_1.authenticate);
router.post('/orders', (0, validate_1.validate)({ body: payment_schema_1.createOrderSchema }), paymentController.createOrder);
router.post('/verify', (0, validate_1.validate)({ body: payment_schema_1.verifyPaymentSchema }), paymentController.verifyPayment);
router.post('/sandbox-complete', (0, validate_1.validate)({ body: zod_1.z.object({ razorpayOrderId: zod_1.z.string().min(1) }) }), paymentController.sandboxComplete);
router.get('/history', (0, validate_1.validate)({ query: payment_schema_1.listPaymentsQuerySchema }), paymentController.listHistory);
router.post('/:id/refund', (0, auth_1.authorizeRoles)('super_admin', 'gym_admin'), (0, validate_1.validate)({ params: payment_schema_1.paymentIdParamSchema, body: payment_schema_1.refundPaymentSchema }), paymentController.refundPayment);
router.get('/:id/invoice', (0, validate_1.validate)({ params: payment_schema_1.paymentIdParamSchema }), paymentController.getInvoice);
exports.paymentRoutes = router;
