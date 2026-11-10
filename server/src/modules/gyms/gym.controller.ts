import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ListGymsQuery } from './gym.schema';
import * as gymService from './gym.service';

export const createGym = asyncHandler(async (req: Request, res: Response) => {
  const gym = await gymService.createGym(req.auth!, req.body);
  return sendSuccess(res, { gym }, { statusCode: 201, message: 'Gym created successfully' });
});

export const listGyms = asyncHandler(async (req: Request, res: Response) => {
  const result = await gymService.listGyms(req.auth!, req.query as unknown as ListGymsQuery);
  return sendSuccess(res, { gyms: result.gyms }, { meta: result.meta });
});

export const getGym = asyncHandler(async (req: Request, res: Response) => {
  const gym = await gymService.getGymById(req.auth!, req.params.id);
  return sendSuccess(res, { gym });
});

export const updateGym = asyncHandler(async (req: Request, res: Response) => {
  const gym = await gymService.updateGym(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { gym }, { message: 'Gym updated successfully' });
});

export const deleteGym = asyncHandler(async (req: Request, res: Response) => {
  await gymService.deleteGym(req.auth!, req.params.id);
  return sendSuccess(res, { deleted: true }, { message: 'Gym deleted successfully' });
});

export const switchActiveGym = asyncHandler(async (req: Request, res: Response) => {
  const result = await gymService.switchActiveGym(req.auth!, req.params.id);
  return sendSuccess(res, result, { message: 'Active gym switched' });
});

