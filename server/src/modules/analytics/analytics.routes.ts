import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as analyticsController from './analytics.controller';
import {
  analyticsQuerySchema,
  createBodyMetricSchema,
  createProgressPhotoSchema,
} from './analytics.schema';

const router = Router();
router.use(authenticate);

router.get('/dashboard', validate({ query: analyticsQuerySchema }), analyticsController.getDashboard);
router.get('/workouts', validate({ query: analyticsQuerySchema }), analyticsController.getWorkouts);
router.get('/body-progress', analyticsController.getBodyProgress);
router.post('/body-metrics', validate({ body: createBodyMetricSchema }), analyticsController.logBodyMetric);
router.post('/progress-photos', validate({ body: createProgressPhotoSchema }), analyticsController.logProgressPhoto);
router.get('/revenue', validate({ query: analyticsQuerySchema }), analyticsController.getRevenue);
router.get('/attendance', validate({ query: analyticsQuerySchema }), analyticsController.getAttendance);

export const analyticsRoutes = router;

