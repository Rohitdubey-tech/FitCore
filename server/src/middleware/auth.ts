import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@fitcore/shared-types';
import { UserModel } from '../modules/users/user.model';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
        gymIds: string[];
        activeGymId?: string;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    const user = await UserModel.findOne({
      _id: decoded.sub,
      isDeleted: { $ne: true },
    }).select('_id role status gymIds activeGymId');

    if (!user) {
      throw new UnauthorizedError('Account not found or deleted');
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      throw new ForbiddenError('Account is suspended or inactive');
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      gymIds: user.gymIds.map((id) => id.toString()),
      activeGymId: user.activeGymId?.toString(),
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(new ForbiddenError('Insufficient role permissions'));
      return;
    }

    next();
  };
}

export function requireGymAccess(paramName = 'gymId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.auth.role === 'super_admin') {
      next();
      return;
    }

    const targetGymId = req.params[paramName] || req.params.id || req.body?.gymId;
    if (!targetGymId || !req.auth.gymIds.includes(String(targetGymId))) {
      next(new ForbiddenError('Cross-tenant gym access denied'));
      return;
    }

    next();
  };
}
