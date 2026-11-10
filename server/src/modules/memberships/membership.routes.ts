import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as membershipController from './membership.controller';
import {
  createPlanSchema,
  createSubscriptionSchema,
  listPlansQuerySchema,
  listSubscriptionsQuerySchema,
  resourceIdParamSchema,
  updatePlanSchema,
  updateSubscriptionSchema,
} from './membership.schema';

const planRouter = Router();
planRouter.use(authenticate);

planRouter.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ body: createPlanSchema }),
  membershipController.createPlan
);
planRouter.get('/', validate({ query: listPlansQuerySchema }), membershipController.listPlans);
planRouter.patch(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: resourceIdParamSchema, body: updatePlanSchema }),
  membershipController.updatePlan
);

const subscriptionRouter = Router();
subscriptionRouter.use(authenticate);

subscriptionRouter.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ body: createSubscriptionSchema }),
  membershipController.createSubscription
);
subscriptionRouter.get(
  '/',
  validate({ query: listSubscriptionsQuerySchema }),
  membershipController.listSubscriptions
);
subscriptionRouter.patch(
  '/:id',
  authorizeRoles('super_admin', 'gym_admin'),
  validate({ params: resourceIdParamSchema, body: updateSubscriptionSchema }),
  membershipController.updateSubscription
);

export { planRouter as membershipPlanRoutes, subscriptionRouter as subscriptionRoutes };

