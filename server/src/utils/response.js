"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, options) {
    const payload = {
        success: true,
        data,
        ...(options?.message ? { message: options.message } : {}),
        ...(options?.meta ? { meta: options.meta } : {}),
    };
    return res.status(options?.statusCode ?? 200).json(payload);
}
function sendError(res, statusCode, code, message, details) {
    const payload = {
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
    };
    return res.status(statusCode).json(payload);
}
