import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFoundError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { objectIdSchema } from '../gyms/gym.schema';
import { PaymentModel } from '../payments/payment.model';
import { UserModel } from '../users/user.model';

const router = Router();
router.use(authenticate, authorizeRoles('super_admin'));

router.get(
  '/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const [totalGyms, activeGyms, totalUsers, gyms, users, auditLogs, revAgg] = await Promise.all([
      GymModel.countDocuments({ isDeleted: { $ne: true } }),
      GymModel.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
      UserModel.countDocuments({ isDeleted: { $ne: true } }),
      GymModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20),
      UserModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20),
      AuditLogModel.find().sort({ createdAt: -1 }).limit(25),
      PaymentModel.aggregate<{ total: number }>([
        { $match: { status: { $in: ['paid', 'partially_refunded'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return sendSuccess(res, {
      metrics: {
        totalGyms,
        activeGyms,
        totalUsers,
        subscriptionRevenue: revAgg[0]?.total ?? 0,
      },
      gyms: gyms.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        contactEmail: g.contactEmail,
        status: g.status,
        subscriptionTier: g.subscriptionTier,
        createdAt: g.createdAt.toISOString(),
      })),
      users: users.map((u) => u.toProfileDTO()),
      auditLogs: auditLogs.map((a) => ({
        id: a._id.toString(),
        action: a.action,
        resourceType: a.resourceType,
        actorRole: a.actorRole,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  })
);

router.patch(
  '/gyms/:id/status',
  validate({
    params: z.object({ id: objectIdSchema }),
    body: z.object({ status: z.enum(['active', 'suspended', 'pending']) }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const gym = await GymModel.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!gym) throw new NotFoundError('Gym not found');

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(req.auth!.userId),
      actorRole: req.auth!.role,
      gymId: gym._id,
      action: `ADMIN_GYM_${req.body.status.toUpperCase()}`,
      resourceType: 'Gym',
      resourceId: gym._id.toString(),
    });

    return sendSuccess(res, { id: gym._id.toString(), status: gym.status });
  })
);

router.patch(
  '/users/:id/status',
  validate({
    params: z.object({ id: objectIdSchema }),
    body: z.object({ status: z.enum(['active', 'suspended']) }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await UserModel.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, { user: user.toProfileDTO() });
  })
);

export const adminRoutes = router;

