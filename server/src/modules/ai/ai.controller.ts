import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import * as aiService from './ai.service';

export const generateDiet = asyncHandler(async (req: Request, res: Response) => {
  const data = await aiService.generateAIDietPlan(req.auth!, req.body);
  return sendSuccess(res, data, { statusCode: 201, message: 'AI diet plan generated' });
});

export const generateWorkout = asyncHandler(async (req: Request, res: Response) => {
  const data = await aiService.generateAIWorkoutPlan(req.auth!, req.body);
  return sendSuccess(res, data, { statusCode: 201, message: 'AI workout plan generated' });
});

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const data = await aiService.chatWithFitnessAssistant(req.auth!, req.body.message);
  return sendSuccess(res, data);
});

export const analyzeMeal = asyncHandler(async (req: Request, res: Response) => {
  const data = await aiService.analyzeMeal(req.auth!, req.body);
  return sendSuccess(res, data);
});

export const listRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await aiService.listRecommendations(req.auth!);
  return sendSuccess(res, { recommendations });
});

