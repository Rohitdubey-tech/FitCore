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
exports.getInvoice = exports.refundPayment = exports.listHistory = exports.handleWebhook = exports.sandboxComplete = exports.verifyPayment = exports.createOrder = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const paymentService = __importStar(require("./payment.service"));
exports.createOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await paymentService.createPaymentOrder(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, result, { statusCode: 201, message: 'Payment order created' });
});
exports.verifyPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await paymentService.verifyPaymentSignature(req.auth, req.body);
    return (0, response_1.sendSuccess)(res, { payment }, { message: 'Payment verified and subscription activated' });
});
exports.sandboxComplete = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await paymentService.completeSandboxPayment(req.auth, req.body.razorpayOrderId);
    return (0, response_1.sendSuccess)(res, { payment }, { message: 'Sandbox payment completed and invoice issued' });
});
exports.handleWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signatureHeader = req.get('x-razorpay-signature');
    const eventIdHeader = req.get('x-razorpay-event-id');
    const result = await paymentService.processRazorpayWebhook(rawBody, signatureHeader, eventIdHeader, req.body);
    return (0, response_1.sendSuccess)(res, result, { message: 'Webhook processed' });
});
exports.listHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await paymentService.listPaymentHistory(req.auth, req.query);
    return (0, response_1.sendSuccess)(res, { payments: result.payments, summary: result.summary }, { meta: result.meta });
});
exports.refundPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await paymentService.refundPayment(req.auth, req.params.id, req.body);
    return (0, response_1.sendSuccess)(res, { payment }, { message: 'Refund processed' });
});
exports.getInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const invoice = await paymentService.getPaymentInvoice(req.auth, req.params.id);
    return (0, response_1.sendSuccess)(res, { invoice });
});
