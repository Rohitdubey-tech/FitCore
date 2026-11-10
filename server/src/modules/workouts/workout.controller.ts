import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import {
  ListExercisesQuery,
  ListSessionsQuery,
  ListWorkoutsQuery,
} from './workout.schema';
import * as workoutService from './workout.service';

export const listExercises = asyncHandler(async (req: Request, res: Response) => {
  const result = await workoutService.listExercises(
    req.auth!,
    req.query as unknown as ListExercisesQuery
  );
  return sendSuccess(res, { exercises: result.exercises }, { meta: result.meta });
});

export const createExercise = asyncHandler(async (req: Request, res: Response) => {
  const exercise = await workoutService.createCustomExercise(req.auth!, req.body);
  return sendSuccess(res, { exercise }, { statusCode: 201, message: 'Exercise created' });
});

export const createWorkoutPlan = asyncHandler(async (req: Request, res: Response) => {
  const workout = await workoutService.createWorkoutPlan(req.auth!, req.body);
  return sendSuccess(res, { workout }, { statusCode: 201, message: 'Workout plan created' });
});

export const listWorkoutPlans = asyncHandler(async (req: Request, res: Response) => {
  const result = await workoutService.listWorkoutPlans(
    req.auth!,
    req.query as unknown as ListWorkoutsQuery
  );
  return sendSuccess(res, { workouts: result.workouts }, { meta: result.meta });
});

export const getWorkoutPlan = asyncHandler(async (req: Request, res: Response) => {
  const workout = await workoutService.getWorkoutPlanById(req.auth!, req.params.id);
  return sendSuccess(res, { workout });
});

export const updateWorkoutPlan = asyncHandler(async (req: Request, res: Response) => {
  const workout = await workoutService.updateWorkoutPlan(
    req.auth!,
    req.params.id,
    req.body
  );
  return sendSuccess(res, { workout }, { message: 'Workout plan updated' });
});

export const logWorkoutSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await workoutService.logWorkoutSession(req.auth!, req.body);
  return sendSuccess(res, { session }, { statusCode: 201, message: 'Workout session logged' });
});

export const updateWorkoutSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await workoutService.updateWorkoutSession(
    req.auth!,
    req.params.id,
    req.body
  );
  return sendSuccess(res, { session }, { message: 'Workout session updated' });
});

export const getWorkoutHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await workoutService.getWorkoutHistory(
    req.auth!,
    req.query as unknown as ListSessionsQuery
  );
  return sendSuccess(
    res,
    { sessions: result.sessions, stats: result.stats },
    { meta: result.meta }
  );
});

