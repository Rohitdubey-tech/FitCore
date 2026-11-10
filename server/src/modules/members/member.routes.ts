import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { gymIdParamSchema } from '../gyms/gym.schema';
import * as memberController from './member.controller';
import {
  createMemberSchema,
  listMembersQuerySchema,
  memberIdParamSchema,
  updateMemberSchema,
} from './member.schema';

const gymScopedRouter = Router({ mergeParams: true });
gymScopedRouter.use(authenticate);

gymScopedRouter.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: gymIdParamSchema, body: createMemberSchema }),
  memberController.createGymMember
);

gymScopedRouter.get(
  '/',
  authorizeRoles('super_admin', 'gym_admin', 'trainer'),
  validate({ params: gymIdParamSchema, query: listMembersQuerySchema }),
  memberController.listGymMembers
);

const memberRouter = Router();
memberRouter.use(authenticate);

memberRouter.get(
  '/:id',
  validate({ params: memberIdParamSchema }),
  memberController.getMember
);

memberRouter.patch(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: memberIdParamSchema, body: updateMemberSchema }),
  memberController.updateMember
);

memberRouter.delete(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: memberIdParamSchema }),
  memberController.deleteMember
);

export { gymScopedRouter as gymMembersRoutes, memberRouter as memberRoutes };

