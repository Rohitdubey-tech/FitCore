"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
function notFoundHandler(req, res) {
    return (0, response_1.sendError)(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}
function errorHandler(err, req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return (0, response_1.sendError)(res, err.statusCode, err.code, err.message, err.details);
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const details = Object.values(err.errors).map((e) => ({
            path: e.path,
            message: e.message,
        }));
        return (0, response_1.sendError)(res, 400, 'VALIDATION_ERROR', 'Database validation failed', details);
    }
    if (err instanceof mongoose_1.default.Error.CastError) {
        return (0, response_1.sendError)(res, 400, 'INVALID_ID', `Invalid value for ${err.path}`);
    }
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
        const keyValue = err.keyValue;
        const duplicateField = keyValue ? Object.keys(keyValue)[0] : 'field';
        return (0, response_1.sendError)(res, 409, 'DUPLICATE_KEY', `${duplicateField} already exists`);
    }
    logger_1.logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled server error');
    return (0, response_1.sendError)(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}
