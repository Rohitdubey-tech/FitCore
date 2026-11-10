import { Request, Response, Router } from 'express';
import { getDatabaseHealth } from '../../config/database';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDatabaseHealth();
  const isHealthy = db.status === 'connected';

  return sendSuccess(
    res,
    {
      service: 'fitcore-api',
      status: isHealthy ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        mongodb: db,
      },
    },
    { statusCode: isHealthy ? 200 : 503 }
  );
});

export const healthRoutes = router;

