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
exports.deleteMe = exports.updateMe = exports.getMe = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const authService = __importStar(require("./auth.service"));
function getSessionMeta(req) {
    return {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    };
}
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.registerUser(req.body, getSessionMeta(req));
    return (0, response_1.sendSuccess)(res, result, {
        statusCode: 201,
        message: 'Account created successfully',
    });
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.loginUser(req.body, getSessionMeta(req));
    return (0, response_1.sendSuccess)(res, result, {
        message: 'Login successful',
    });
});
exports.refresh = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.refreshUserTokens(req.body.refreshToken, getSessionMeta(req));
    return (0, response_1.sendSuccess)(res, result, {
        message: 'Tokens refreshed',
    });
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await authService.logoutUser(req.auth.userId, req.body, getSessionMeta(req));
    return (0, response_1.sendSuccess)(res, { loggedOut: true }, { message: 'Logged out successfully' });
});
exports.forgotPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.email);
    return (0, response_1.sendSuccess)(res, result, {
        message: 'If an account exists for that email, reset instructions have been issued',
    });
});
exports.resetPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await authService.resetUserPassword(req.body.token, req.body.newPassword);
    return (0, response_1.sendSuccess)(res, { reset: true }, { message: 'Password updated successfully' });
});
exports.verifyEmail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await authService.verifyUserEmail(req.body.token);
    return (0, response_1.sendSuccess)(res, { user }, { message: 'Email verified successfully' });
});
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await authService.getUserProfile(req.auth.userId);
    return (0, response_1.sendSuccess)(res, { user });
});
exports.updateMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await authService.updateUserProfile(req.auth.userId, req.body);
    return (0, response_1.sendSuccess)(res, { user }, { message: 'Profile updated' });
});
exports.deleteMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await authService.deleteUserAccount(req.auth.userId);
    return (0, response_1.sendSuccess)(res, { deleted: true }, { message: 'Account deleted' });
});
