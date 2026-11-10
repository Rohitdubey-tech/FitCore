import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as aiController from './ai.controller';
import {
  aiChatSchema,
  aiDietSchema,
  aiMealAnalyzeSchema,
  aiWorkoutSchema,
} from './ai.schema';

const router = Router();
router.use(authenticate);

router.post('/diet/generate', validate({ body: aiDietSchema }), aiController.generateDiet);
router.post('/workout/generate', validate({ body: aiWorkoutSchema }), aiController.generateWorkout);
router.post('/chat', validate({ body: aiChatSchema }), aiController.chat);
router.post('/meal/analyze', validate({ body: aiMealAnalyzeSchema }), aiController.analyzeMeal);
router.get('/recommendations', aiController.listRecommendations);

export const aiRoutes = router;

