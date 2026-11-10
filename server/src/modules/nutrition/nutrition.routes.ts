import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as nutritionController from './nutrition.controller';
import {
  createDietPlanSchema,
  createFoodLogSchema,
  dailySummaryQuerySchema,
  foodLogIdParamSchema,
  searchFoodsQuerySchema,
} from './nutrition.schema';

const router = Router();
router.use(authenticate);

router.get('/foods', validate({ query: searchFoodsQuerySchema }), nutritionController.searchFoods);
router.post('/diet-plans', validate({ body: createDietPlanSchema }), nutritionController.createDietPlan);
router.get('/diet-plans', nutritionController.listDietPlans);
router.post('/food-logs', validate({ body: createFoodLogSchema }), nutritionController.createFoodLog);
router.get('/daily-summary', validate({ query: dailySummaryQuerySchema }), nutritionController.getDailySummary);
router.delete('/food-logs/:id', validate({ params: foodLogIdParamSchema }), nutritionController.deleteFoodLog);

export const nutritionRoutes = router;

