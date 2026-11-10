import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openApiSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { sanitizeRequest } from './middleware/sanitize';
import { adminRoutes } from './modules/admin/admin.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { gymRoutes } from './modules/gyms/gym.routes';
import { healthRoutes } from './modules/health/health.routes';
import { gymMembersRoutes, memberRoutes } from './modules/members/member.routes';
import { membershipPlanRoutes, subscriptionRoutes } from './modules/memberships/membership.routes';
import { messageRoutes } from './modules/messages/message.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { nutritionRoutes } from './modules/nutrition/nutrition.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { gymTrainersRoutes, trainerRoutes } from './modules/trainers/trainer.routes';
import {
  exerciseRoutes,
  workoutRoutes,
  workoutSessionRoutes,
} from './modules/workouts/workout.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOriginsList.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS policy rejected origin'));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
      })
    );
  }

  app.use(apiRateLimiter);

  // Root & versioned health endpoints
  app.use('/health', healthRoutes);
  app.use(`${env.API_PREFIX}/health`, healthRoutes);

  // OpenAPI documentation
  app.use(`${env.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Versioned API modules
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/gyms/:id/members`, gymMembersRoutes);
  app.use(`${env.API_PREFIX}/gyms/:id/trainers`, gymTrainersRoutes);
  app.use(`${env.API_PREFIX}/gyms`, gymRoutes);
  app.use(`${env.API_PREFIX}/members`, memberRoutes);
  app.use(`${env.API_PREFIX}/trainers`, trainerRoutes);
  app.use(`${env.API_PREFIX}/membership-plans`, membershipPlanRoutes);
  app.use(`${env.API_PREFIX}/subscriptions`, subscriptionRoutes);
  app.use(`${env.API_PREFIX}/payments`, paymentRoutes);
  app.use(`${env.API_PREFIX}/exercises`, exerciseRoutes);
  app.use(`${env.API_PREFIX}/workouts`, workoutRoutes);
  app.use(`${env.API_PREFIX}/workout-sessions`, workoutSessionRoutes);
  app.use(`${env.API_PREFIX}/nutrition`, nutritionRoutes);
  app.use(`${env.API_PREFIX}/ai`, aiRoutes);
  app.use(`${env.API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${env.API_PREFIX}/admin`, adminRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${env.API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${env.API_PREFIX}/messages`, messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

