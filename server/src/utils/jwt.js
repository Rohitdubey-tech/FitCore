"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = hashToken;
exports.generateRandomToken = generateRandomToken;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.parseDurationToMs = parseDurationToMs;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function hashToken(rawToken) {
    return crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
}
function generateRandomToken(bytes = 32) {
    return crypto_1.default.randomBytes(bytes).toString('hex');
}
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, env_1.env.JWT_ACCESS_SECRET, { expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN });
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN });
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
    }
    return decoded;
}
function verifyRefreshToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
    }
    return decoded;
}
function parseDurationToMs(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
}
