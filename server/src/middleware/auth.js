"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorizeRoles = authorizeRoles;
exports.requireGymAccess = requireGymAccess;
const user_model_1 = require("../modules/users/user.model");
const errors_1 = require("../utils/errors");
const jwt_1 = require("../utils/jwt");
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Missing or invalid authorization header');
        }
        const token = authHeader.slice(7).trim();
        if (!token) {
            throw new errors_1.UnauthorizedError('Access token is required');
        }
        let decoded;
        try {
            decoded = (0, jwt_1.verifyAccessToken)(token);
        }
        catch {
            throw new errors_1.UnauthorizedError('Invalid or expired access token');
        }
        const user = await user_model_1.UserModel.findOne({
            _id: decoded.sub,
            isDeleted: { $ne: true },
        }).select('_id role status gymIds activeGymId');
        if (!user) {
            throw new errors_1.UnauthorizedError('Account not found or deleted');
        }
        if (user.status === 'suspended' || user.status === 'deleted') {
            throw new errors_1.ForbiddenError('Account is suspended or inactive');
        }
        req.auth = {
            userId: user._id.toString(),
            role: user.role,
            gymIds: user.gymIds.map((id) => id.toString()),
            activeGymId: user.activeGymId?.toString(),
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
function authorizeRoles(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.auth) {
            next(new errors_1.UnauthorizedError('Authentication required'));
            return;
        }
        if (!allowedRoles.includes(req.auth.role)) {
            next(new errors_1.ForbiddenError('Insufficient role permissions'));
            return;
        }
        next();
    };
}
function requireGymAccess(paramName = 'gymId') {
    return (req, _res, next) => {
        if (!req.auth) {
            next(new errors_1.UnauthorizedError('Authentication required'));
            return;
        }
        if (req.auth.role === 'super_admin') {
            next();
            return;
        }
        const targetGymId = req.params[paramName] || req.params.id || req.body?.gymId;
        if (!targetGymId || !req.auth.gymIds.includes(String(targetGymId))) {
            next(new errors_1.ForbiddenError('Cross-tenant gym access denied'));
            return;
        }
        next();
    };
}
