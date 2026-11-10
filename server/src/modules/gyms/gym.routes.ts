import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as gymController from './gym.controller';
import {
  createGymSchema,
  gymIdParamSchema,
  listGymsQuerySchema,
  updateGymSchema,
} from './gym.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ body: createGymSchema }),
  gymController.createGym
);
router.get('/', validate({ query: listGymsQuerySchema }), gymController.listGyms);
router.get('/:id', validate({ params: gymIdParamSchema }), gymController.getGym);
router.patch(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: gymIdParamSchema, body: updateGymSchema }),
  gymController.updateGym
);
router.delete(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: gymIdParamSchema }),
  gymController.deleteGym
);
router.post(
  '/:id/switch',
  validate({ params: gymIdParamSchema }),
  gymController.switchActiveGym
);

export const gymRoutes = router;

