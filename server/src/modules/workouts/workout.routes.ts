import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as workoutController from './workout.controller';
import {
  createExerciseSchema,
  createWorkoutPlanSchema,
  createWorkoutSessionSchema,
  listExercisesQuerySchema,
  listSessionsQuerySchema,
  listWorkoutsQuerySchema,
  updateWorkoutPlanSchema,
  updateWorkoutSessionSchema,
  workoutIdParamSchema,
} from './workout.schema';

const exerciseRouter = Router();
exerciseRouter.use(authenticate);
exerciseRouter.get('/', validate({ query: listExercisesQuerySchema }), workoutController.listExercises);
exerciseRouter.post(
  '/',
  authorizeRoles('super_admin', 'gym_admin', 'trainer'),
  validate({ body: createExerciseSchema }),
  workoutController.createExercise
);

const workoutPlanRouter = Router();
workoutPlanRouter.use(authenticate);
workoutPlanRouter.post('/', validate({ body: createWorkoutPlanSchema }), workoutController.createWorkoutPlan);
workoutPlanRouter.get('/', validate({ query: listWorkoutsQuerySchema }), workoutController.listWorkoutPlans);
workoutPlanRouter.get('/:id', validate({ params: workoutIdParamSchema }), workoutController.getWorkoutPlan);
workoutPlanRouter.patch(
  '/:id',
  validate({ params: workoutIdParamSchema, body: updateWorkoutPlanSchema }),
  workoutController.updateWorkoutPlan
);

const sessionRouter = Router();
sessionRouter.use(authenticate);
sessionRouter.post('/', validate({ body: createWorkoutSessionSchema }), workoutController.logWorkoutSession);
sessionRouter.get('/history', validate({ query: listSessionsQuerySchema }), workoutController.getWorkoutHistory);
sessionRouter.patch(
  '/:id',
  validate({ params: workoutIdParamSchema, body: updateWorkoutSessionSchema }),
  workoutController.updateWorkoutSession
);

export {
  exerciseRouter as exerciseRoutes,
  sessionRouter as workoutSessionRoutes,
  workoutPlanRouter as workoutRoutes,
};

