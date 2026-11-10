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
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const validate_1 = require("../../middleware/validate");
const authController = __importStar(require("./auth.controller"));
const auth_schema_1 = require("./auth.schema");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_1.authRateLimiter, (0, validate_1.validate)({ body: auth_schema_1.registerSchema }), authController.register);
router.post('/login', rateLimiter_1.authRateLimiter, (0, validate_1.validate)({ body: auth_schema_1.loginSchema }), authController.login);
router.post('/refresh', rateLimiter_1.authRateLimiter, (0, validate_1.validate)({ body: auth_schema_1.refreshSchema }), authController.refresh);
router.post('/logout', auth_1.authenticate, (0, validate_1.validate)({ body: auth_schema_1.logoutSchema }), authController.logout);
router.post('/forgot-password', rateLimiter_1.authRateLimiter, (0, validate_1.validate)({ body: auth_schema_1.forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', rateLimiter_1.authRateLimiter, (0, validate_1.validate)({ body: auth_schema_1.resetPasswordSchema }), authController.resetPassword);
router.post('/verify-email', (0, validate_1.validate)({ body: auth_schema_1.verifyEmailSchema }), authController.verifyEmail);
router.get('/me', auth_1.authenticate, authController.getMe);
router.patch('/me', auth_1.authenticate, (0, validate_1.validate)({ body: auth_schema_1.updateProfileSchema }), authController.updateMe);
router.delete('/me', auth_1.authenticate, authController.deleteMe);
exports.authRoutes = router;
