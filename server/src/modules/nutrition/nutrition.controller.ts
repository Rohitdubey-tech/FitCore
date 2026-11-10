import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { SearchFoodsQuery } from './nutrition.schema';
import * as nutritionService from './nutrition.service';

export const searchFoods = asyncHandler(async (req: Request, res: Response) => {
  const result = await nutritionService.searchFoods(
    req.query as unknown as SearchFoodsQuery
  );
  return sendSuccess(res, { foods: result.foods }, { meta: result.meta });
});

export const createDietPlan = asyncHandler(async (req: Request, res: Response) => {
  const dietPlan = await nutritionService.createDietPlan(req.auth!, req.body);
  return sendSuccess(res, { dietPlan }, { statusCode: 201, message: 'Diet plan saved' });
});

export const listDietPlans = asyncHandler(async (req: Request, res: Response) => {
  const dietPlans = await nutritionService.listDietPlans(req.auth!);
  return sendSuccess(res, { dietPlans });
});

export const createFoodLog = asyncHandler(async (req: Request, res: Response) => {
  const foodLog = await nutritionService.logFoodOrWater(req.auth!, req.body);
  return sendSuccess(res, { foodLog }, { statusCode: 201, message: 'Intake logged' });
});

export const getDailySummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await nutritionService.getDailyNutritionSummary(
    req.auth!,
    req.query.dateKey as string | undefined
  );
  return sendSuccess(res, { summary });
});

export const deleteFoodLog = asyncHandler(async (req: Request, res: Response) => {
  await nutritionService.deleteFoodLog(req.auth!, req.params.id);
  return sendSuccess(res, { deleted: true }, { message: 'Entry removed' });
});

