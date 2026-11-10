import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ConversationModel } from '../ai/conversation.model';
import { objectIdSchema } from '../gyms/gym.schema';
import { GymMemberModel } from '../members/gymMember.model';
import { createAndDispatchNotification } from '../notifications/notification.service';
import { TrainerModel } from '../trainers/trainer.model';
import { IUser, UserModel } from '../users/user.model';

const router = Router();
router.use(authenticate);

router.get(
  '/contacts',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = req.auth!;
    const contactsMap = new Map<
      string,
      { id: string; firstName: string; lastName: string; email: string; role: string }
    >();

    if (actor.role === 'trainer') {
      const trainer = await TrainerModel.findOne({
        userId: actor.userId,
        isDeleted: { $ne: true },
      }).select('_id gymId');
      if (trainer) {
        const assigned = await GymMemberModel.find({
          gymId: trainer.gymId,
          assignedTrainerId: trainer._id,
          isDeleted: { $ne: true },
        }).populate<{ userId: IUser }>('userId');
        for (const m of assigned) {
          if (m.userId) {
            contactsMap.set(m.userId._id.toString(), {
              id: m.userId._id.toString(),
              firstName: m.userId.firstName,
              lastName: m.userId.lastName,
              email: m.userId.email,
              role: m.userId.role,
            });
          }
        }
      }
    } else if (actor.role === 'member') {
      const memberships = await GymMemberModel.find({
        userId: actor.userId,
        isDeleted: { $ne: true },
        assignedTrainerId: { $exists: true },
      }).select('assignedTrainerId');
      const trainerIds = memberships
        .map((m) => m.assignedTrainerId)
        .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
      if (trainerIds.length > 0) {
        const trainers = await TrainerModel.find({ _id: { $in: trainerIds } }).populate<{
          userId: IUser;
        }>('userId');
        for (const t of trainers) {
          if (t.userId) {
            contactsMap.set(t.userId._id.toString(), {
              id: t.userId._id.toString(),
              firstName: t.userId.firstName,
              lastName: t.userId.lastName,
              email: t.userId.email,
              role: t.userId.role,
            });
          }
        }
      }
    } else if (actor.gymIds.length > 0) {
      const gymUsers = await UserModel.find({
        gymIds: { $in: actor.gymIds.map((id) => new mongoose.Types.ObjectId(id)) },
        _id: { $ne: new mongoose.Types.ObjectId(actor.userId) },
        isDeleted: { $ne: true },
      }).limit(50);
      for (const u of gymUsers) {
        contactsMap.set(u._id.toString(), {
          id: u._id.toString(),
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
        });
      }
    }

    return sendSuccess(res, { contacts: Array.from(contactsMap.values()) });
  })
);

router.get(
  '/',
  validate({ query: z.object({ peerUserId: objectIdSchema }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.auth!.userId);
    const peerId = new mongoose.Types.ObjectId(req.query.peerUserId as string);

    const convo = await ConversationModel.findOne({
      channel: 'trainer_member',
      $or: [
        { userId, peerUserId: peerId },
        { userId: peerId, peerUserId: userId },
      ],
    });

    return sendSuccess(res, {
      messages: (convo?.messages || []).map((m) => ({
        senderId: m.senderId?.toString(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  })
);

router.post(
  '/',
  validate({
    body: z.object({
      peerUserId: objectIdSchema,
      content: z.string().trim().min(1).max(2000),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.auth!.userId);
    const peerId = new mongoose.Types.ObjectId(req.body.peerUserId);

    let convo = await ConversationModel.findOne({
      channel: 'trainer_member',
      $or: [
        { userId, peerUserId: peerId },
        { userId: peerId, peerUserId: userId },
      ],
    });

    if (!convo) {
      convo = new ConversationModel({
        gymId: req.auth!.activeGymId ? new mongoose.Types.ObjectId(req.auth!.activeGymId) : undefined,
        userId,
        peerUserId: peerId,
        channel: 'trainer_member',
        messages: [],
      });
    }

    const msgRole = req.auth!.role === 'trainer' ? 'trainer' : 'member';
    convo.messages.push({
      senderId: userId,
      role: msgRole,
      content: req.body.content,
      createdAt: new Date(),
    });
    await convo.save();

    await createAndDispatchNotification({
      userId: req.body.peerUserId,
      gymId: req.auth!.activeGymId,
      type: 'trainer_message',
      title: 'New Coaching Message',
      body: req.body.content.slice(0, 140),
    });

    return sendSuccess(res, { sent: true }, { statusCode: 201 });
  })
);

export const messageRoutes = router;
