"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = 'Bad request', details) {
        super(400, 'BAD_REQUEST', message, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(401, 'UNAUTHORIZED', message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(403, 'FORBIDDEN', message);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, 'NOT_FOUND', message);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(409, 'CONFLICT', message);
    }
}
exports.ConflictError = ConflictError;
