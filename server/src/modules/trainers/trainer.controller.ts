import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ListTrainersQuery } from './trainer.schema';
import * as trainerService from './trainer.service';

export const createTrainer = asyncHandler(async (req: Request, res: Response) => {
  const trainer = await trainerService.createTrainer(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { trainer }, { statusCode: 201, message: 'Trainer added successfully' });
});

export const listTrainers = asyncHandler(async (req: Request, res: Response) => {
  const result = await trainerService.listTrainers(
    req.auth!,
    req.params.id,
    req.query as unknown as ListTrainersQuery
  );
  return sendSuccess(res, { trainers: result.trainers }, { meta: result.meta });
});

export const getTrainer = asyncHandler(async (req: Request, res: Response) => {
  const trainer = await trainerService.getTrainerById(req.auth!, req.params.id);
  return sendSuccess(res, { trainer });
});

export const updateTrainer = asyncHandler(async (req: Request, res: Response) => {
  const trainer = await trainerService.updateTrainer(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { trainer }, { message: 'Trainer updated successfully' });
});

export const assignMembers = asyncHandler(async (req: Request, res: Response) => {
  const result = await trainerService.assignMembersToTrainer(
    req.auth!,
    req.params.id,
    req.body.memberIds
  );
  return sendSuccess(res, result, { message: 'Assigned members updated' });
});

