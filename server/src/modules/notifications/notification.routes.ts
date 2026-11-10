import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { objectIdSchema } from '../gyms/gym.schema';
import { NOTIFICATION_TYPES } from './notification.model';
import * as notificationService from './notification.service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await notificationService.listUserNotifications(req.auth!, page, limit);
    return sendSuccess(
      res,
      { notifications: result.notifications, unreadCount: result.unreadCount },
      { meta: result.meta }
    );
  })
);

router.patch(
  '/:id/read',
  validate({ params: z.object({ id: objectIdSchema }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.markNotificationRead(req.auth!, req.params.id);
    return sendSuccess(res, { notification }, { message: 'Notification marked as read' });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.markAllNotificationsRead(req.auth!);
    return sendSuccess(res, result, { message: 'All notifications marked as read' });
  })
);

router.post(
  '/test-reminder',
  validate({
    body: z.object({
      type: z.enum(NOTIFICATION_TYPES).default('workout_reminder'),
      title: z.string().trim().min(2).max(160).default('Time to train!'),
      body: z.string().trim().min(2).max(500).default('Your scheduled FITCORE session starts soon.'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.createAndDispatchNotification({
      userId: req.auth!.userId,
      gymId: req.auth!.activeGymId,
      type: req.body.type,
      title: req.body.title,
      body: req.body.body,
    });
    return sendSuccess(res, { notification }, { statusCode: 201 });
  })
);

export const notificationRoutes = router;

