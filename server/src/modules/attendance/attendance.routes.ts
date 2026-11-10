import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../../config/env';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { GymModel } from '../gyms/gym.model';
import { objectIdSchema } from '../gyms/gym.schema';
import { GymMemberModel } from '../members/gymMember.model';
import { createAndDispatchNotification } from '../notifications/notification.service';
import { IUser } from '../users/user.model';
import { AttendanceModel } from './attendance.model';

function signQrPayload(data: string): string {
  return crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(data)
    .digest('hex');
}

function verifyQrToken(token: string): { gymId: string; branchId?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new BadRequestError('Invalid QR token format');
  }
  const [encodedPayload, sig] = parts;
  const expected = signQrPayload(encodedPayload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new BadRequestError('Invalid QR token signature');
  }
  const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
    gymId: string;
    branchId?: string;
    expiresAt: number;
  };
  if (Date.now() > parsed.expiresAt) {
    throw new BadRequestError('QR check-in token has expired');
  }
  return { gymId: parsed.gymId, branchId: parsed.branchId };
}

const router = Router();
router.use(authenticate);

router.post(
  '/qr-token',
  authorizeRoles('super_admin', 'gym_admin', 'trainer'),
  validate({
    body: z.object({
      gymId: objectIdSchema,
      branchId: objectIdSchema.optional(),
      ttlMinutes: z.coerce.number().int().min(1).max(1440).default(15),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { gymId, branchId, ttlMinutes } = req.body;
    if (req.auth!.role !== 'super_admin' && !req.auth!.gymIds.includes(gymId)) {
      throw new ForbiddenError('Cross-tenant gym access denied');
    }
    const payload = {
      gymId,
      branchId,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const qrToken = `${encoded}.${signQrPayload(encoded)}`;

    return sendSuccess(res, {
      qrToken,
      expiresAt: new Date(payload.expiresAt).toISOString(),
    });
  })
);

router.post(
  '/check-in',
  validate({
    body: z.object({
      qrToken: z.string().optional(),
      gymId: objectIdSchema.optional(),
      branchId: objectIdSchema.optional(),
      memberId: objectIdSchema.optional(),
      membershipCode: z.string().trim().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    let gymId = req.body.gymId as string | undefined;
    let branchId = req.body.branchId as string | undefined;
    let method: 'qr' | 'manual' = 'manual';

    if (req.body.qrToken) {
      const decoded = verifyQrToken(req.body.qrToken);
      gymId = decoded.gymId;
      branchId = decoded.branchId;
      method = 'qr';
    }

    if (!gymId) {
      gymId = req.auth!.activeGymId;
    }
    if (!gymId) {
      throw new BadRequestError('gymId or qrToken is required');
    }

    if (req.auth!.role !== 'super_admin' && !req.auth!.gymIds.includes(gymId)) {
      throw new ForbiddenError('Cross-tenant gym access denied');
    }

    let member;
    if (req.body.memberId) {
      member = await GymMemberModel.findOne({ _id: req.body.memberId, gymId, isDeleted: { $ne: true } });
    } else if (req.body.membershipCode) {
      member = await GymMemberModel.findOne({
        membershipCode: req.body.membershipCode,
        gymId,
        isDeleted: { $ne: true },
      });
    } else {
      member = await GymMemberModel.findOne({
        userId: req.auth!.userId,
        gymId,
        isDeleted: { $ne: true },
      });
    }

    if (!member) {
      throw new NotFoundError('Active gym membership record not found');
    }
    if (member.status === 'suspended') {
      throw new ForbiddenError('Membership is suspended; check-in blocked');
    }

    const dateKey = new Date().toISOString().slice(0, 10);
    const existingOpen = await AttendanceModel.findOne({
      gymId,
      memberId: member._id,
      dateKey,
      status: 'checked_in',
    });
    if (existingOpen) {
      throw new ConflictError('Member is already checked in today');
    }

    const record = await AttendanceModel.create({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined,
      memberId: member._id,
      userId: member.userId,
      dateKey,
      checkInAt: new Date(),
      method,
      status: 'checked_in',
    });

    const gym = await GymModel.findById(gymId).select('name');
    await createAndDispatchNotification({
      userId: member.userId.toString(),
      gymId,
      type: 'attendance_confirmation',
      title: 'Gym Check-In Confirmed',
      body: `Checked in at ${gym?.name || 'your gym'} (${method.toUpperCase()}). Have a great session!`,
      metadata: { attendanceId: record._id.toString() },
    });

    return sendSuccess(
      res,
      {
        attendance: {
          id: record._id.toString(),
          gymId: record.gymId.toString(),
          memberId: record.memberId.toString(),
          dateKey: record.dateKey,
          checkInAt: record.checkInAt.toISOString(),
          method: record.method,
          status: record.status,
        },
      },
      { statusCode: 201, message: 'Checked in successfully' }
    );
  })
);

router.post(
  '/check-out',
  validate({
    body: z.object({
      gymId: objectIdSchema.optional(),
      memberId: objectIdSchema.optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.body.gymId || req.auth!.activeGymId;
    if (!gymId) {
      throw new BadRequestError('gymId is required');
    }

    const filter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
      status: 'checked_in',
    };
    if (req.body.memberId) {
      filter.memberId = new mongoose.Types.ObjectId(req.body.memberId);
    } else {
      filter.userId = new mongoose.Types.ObjectId(req.auth!.userId);
    }

    const record = await AttendanceModel.findOne(filter).sort({ checkInAt: -1 });
    if (!record) {
      throw new NotFoundError('No active check-in found');
    }

    record.checkOutAt = new Date();
    record.status = 'checked_out';
    await record.save();

    return sendSuccess(
      res,
      {
        attendance: {
          id: record._id.toString(),
          status: record.status,
          checkInAt: record.checkInAt.toISOString(),
          checkOutAt: record.checkOutAt.toISOString(),
        },
      },
      { message: 'Checked out successfully' }
    );
  })
);

router.get(
  '/',
  validate({
    query: z.object({
      gymId: objectIdSchema.optional(),
      dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const gymId = (req.query.gymId as string | undefined) || req.auth!.activeGymId;
    if (gymId && req.auth!.role !== 'super_admin' && !req.auth!.gymIds.includes(gymId)) {
      throw new ForbiddenError('Cross-tenant gym access denied');
    }

    const filter: Record<string, unknown> = {};
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);
    if (req.query.dateKey) filter.dateKey = req.query.dateKey;
    if (req.auth!.role === 'member') {
      filter.userId = new mongoose.Types.ObjectId(req.auth!.userId);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      AttendanceModel.find(filter)
        .sort({ checkInAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ userId: IUser }>('userId'),
      AttendanceModel.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      {
        attendance: records.map((r) => ({
          id: r._id.toString(),
          gymId: r.gymId.toString(),
          memberId: r.memberId.toString(),
          dateKey: r.dateKey,
          checkInAt: r.checkInAt.toISOString(),
          checkOutAt: r.checkOutAt?.toISOString(),
          method: r.method,
          status: r.status,
          memberName: r.userId ? `${r.userId.firstName} ${r.userId.lastName}` : undefined,
        })),
      },
      {
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }
    );
  })
);

export const attendanceRoutes = router;

