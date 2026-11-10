"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = sanitizeRequest;
function sanitizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const clean = {};
        for (const [key, val] of Object.entries(value)) {
            if (key.startsWith('$') || key.includes('.')) {
                continue;
            }
            clean[key] = sanitizeValue(val);
        }
        return clean;
    }
    return value;
}
function sanitizeRequest(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeValue(req.params);
    }
    next();
}
