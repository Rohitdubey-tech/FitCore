import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { gymIdParamSchema } from '../gyms/gym.schema';
import * as trainerController from './trainer.controller';
import {
  assignMembersSchema,
  createTrainerSchema,
  listTrainersQuerySchema,
  trainerIdParamSchema,
  updateTrainerSchema,
} from './trainer.schema';

const gymScopedRouter = Router({ mergeParams: true });
gymScopedRouter.use(authenticate);

gymScopedRouter.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: gymIdParamSchema, body: createTrainerSchema }),
  trainerController.createTrainer
);

gymScopedRouter.get(
  '/',
  authorizeRoles('super_admin', 'gym_admin', 'trainer', 'member'),
  validate({ params: gymIdParamSchema, query: listTrainersQuerySchema }),
  trainerController.listTrainers
);

const trainerRouter = Router();
trainerRouter.use(authenticate);

trainerRouter.get(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin', 'trainer'),
  validate({ params: trainerIdParamSchema }),
  trainerController.getTrainer
);

trainerRouter.patch(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin', 'trainer'),
  validate({ params: trainerIdParamSchema, body: updateTrainerSchema }),
  trainerController.updateTrainer
);

trainerRouter.post(
  '/:id/assign-members',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: trainerIdParamSchema, body: assignMembersSchema }),
  trainerController.assignMembers
);

export { gymScopedRouter as gymTrainersRoutes, trainerRouter as trainerRoutes };

