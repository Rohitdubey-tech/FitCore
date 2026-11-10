import { env } from './env';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'FITCORE Platform API',
    version: '1.0.0',
    description:
      'Multi-tenant AI-powered Gym Management SaaS and Fitness Tracking REST API',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'API & Database health check',
        responses: {
          '200': { description: 'Service is healthy' },
          '503': { description: 'Service dependencies degraded' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new member or gym owner',
        responses: {
          '201': { description: 'User created with access and refresh tokens' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and issue JWT tokens',
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue new access token',
        responses: {
          '200': { description: 'Tokens rotated' },
          '401': { description: 'Invalid, expired, or reused refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke active session or all sessions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset token',
        responses: { '200': { description: 'Accepted' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using token',
        responses: { '200': { description: 'Password updated' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile payload' } },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updated profile' } },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Soft-delete authenticated user account',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Account deleted' } },
      },
    },
    '/gyms': {
      post: {
        tags: ['Gyms'],
        summary: 'Create a gym profile with branches & operating hours',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Gym created' } },
      },
      get: {
        tags: ['Gyms'],
        summary: 'List authorized gyms with search and pagination',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of gyms' } },
      },
    },
    '/gyms/{id}': {
      get: {
        tags: ['Gyms'],
        summary: 'Get gym details (tenant-isolated)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Gym details' } },
      },
      patch: {
        tags: ['Gyms'],
        summary: 'Update gym details, branches, or operating hours',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Gym updated' } },
      },
      delete: {
        tags: ['Gyms'],
        summary: 'Soft-delete gym',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Gym deleted' } },
      },
    },
    '/gyms/{id}/members': {
      post: {
        tags: ['Members'],
        summary: 'Register a member into a gym',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Member registered' } },
      },
      get: {
        tags: ['Members'],
        summary: 'Search, filter, sort, and paginate gym members',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated members' } },
      },
    },
    '/members/{id}': {
      get: {
        tags: ['Members'],
        summary: 'Get member details (tenant and owner isolated)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Member details' } },
      },
      patch: {
        tags: ['Members'],
        summary: 'Update member profile and membership details',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Member updated' } },
      },
      delete: {
        tags: ['Members'],
        summary: 'Soft-delete member from gym',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Member deleted' } },
      },
    },
    '/gyms/{id}/trainers': {
      post: {
        tags: ['Trainers'],
        summary: 'Add a personal trainer to a gym',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Trainer added' } },
      },
      get: {
        tags: ['Trainers'],
        summary: 'List trainers in a gym',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of trainers' } },
      },
    },
    '/trainers/{id}': {
      get: {
        tags: ['Trainers'],
        summary: 'Get trainer profile and workload',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Trainer profile' } },
      },
      patch: {
        tags: ['Trainers'],
        summary: 'Update trainer profile and weekly schedule',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Trainer updated' } },
      },
    },
    '/membership-plans': {
      post: {
        tags: ['Memberships'],
        summary: 'Create a membership plan (monthly, quarterly, half-yearly, annual, custom)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Plan created' } },
      },
      get: {
        tags: ['Memberships'],
        summary: 'List membership plans',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of plans' } },
      },
    },
    '/subscriptions': {
      post: {
        tags: ['Memberships'],
        summary: 'Create/activate a member subscription',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Subscription created' } },
      },
      get: {
        tags: ['Memberships'],
        summary: 'List subscriptions with status and expiration filters',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Subscriptions list' } },
      },
    },
    '/subscriptions/{id}': {
      patch: {
        tags: ['Memberships'],
        summary: 'Renew, suspend, resume, or cancel a subscription',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Subscription updated' } },
      },
    },
    '/payments/orders': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Razorpay payment order for a membership plan',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Order created' } },
      },
    },
    '/payments/verify': {
      post: {
        tags: ['Payments'],
        summary: 'Verify Razorpay checkout HMAC signature and activate subscription',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payment verified' } },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Handle Razorpay webhook events with raw-body signature verification & idempotency',
        responses: { '200': { description: 'Webhook processed' } },
      },
    },
    '/payments/history': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment history and revenue summary',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payment history & revenue summary' } },
      },
    },
    '/payments/{id}/refund': {
      post: {
        tags: ['Payments'],
        summary: 'Issue full or partial refund for a paid transaction',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Refund processed' } },
      },
    },
    '/payments/{id}/invoice': {
      get: {
        tags: ['Payments'],
        summary: 'Retrieve structured invoice details for a paid transaction',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Invoice data' } },
      },
    },
    '/exercises': {
      get: {
        tags: ['Workouts'],
        summary: 'Search and filter exercise library',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Exercise list' } },
      },
    },
    '/workouts': {
      post: {
        tags: ['Workouts'],
        summary: 'Create a workout plan',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Workout plan created' } },
      },
      get: {
        tags: ['Workouts'],
        summary: 'List workout plans',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workout plans list' } },
      },
    },
    '/workout-sessions': {
      post: {
        tags: ['Workouts'],
        summary: 'Log a workout session with automatic volume & PR detection',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Session logged' } },
      },
    },
    '/workout-sessions/history': {
      get: {
        tags: ['Workouts'],
        summary: 'Get workout history, streak, volume, and PR statistics',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workout history & stats' } },
      },
    },
    '/nutrition/foods': {
      get: {
        tags: ['Nutrition'],
        summary: 'Search verified Indian & international food items',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Verified food items' } },
      },
    },
    '/nutrition/diet-plans': {
      post: {
        tags: ['Nutrition'],
        summary: 'Create a diet plan using verified nutrition database items',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Diet plan created' } },
      },
      get: {
        tags: ['Nutrition'],
        summary: 'List diet plans',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Diet plans' } },
      },
    },
    '/nutrition/food-logs': {
      post: {
        tags: ['Nutrition'],
        summary: 'Log a meal or water intake entry',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Food or water logged' } },
      },
    },
    '/nutrition/daily-summary': {
      get: {
        tags: ['Nutrition'],
        summary: 'Get daily calories, macros, water intake vs targets',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Daily nutrition summary' } },
      },
    },
    '/ai/diet/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate personalized diet plan using verified nutrition database',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'AI diet plan generated' } },
      },
    },
    '/ai/workout/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate personalized workout split using exercise library',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'AI workout plan generated' } },
      },
    },
    '/ai/chat': {
      post: {
        tags: ['AI'],
        summary: 'Chat with AI fitness assistant grounded in authorized user telemetry',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Assistant reply' } },
      },
    },
    '/ai/meal/analyze': {
      post: {
        tags: ['AI'],
        summary: 'Estimate meal macros with uncertainty disclosure',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Meal estimate' } },
      },
    },
    '/ai/recommendations': {
      get: {
        tags: ['AI'],
        summary: 'List saved AI recommendations for current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Recommendation history' } },
      },
    },
    '/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Role-aware dashboard KPIs',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard KPIs' } },
      },
    },
    '/analytics/workouts': {
      get: {
        tags: ['Analytics'],
        summary: 'Workout volume & PR time series',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workout series' } },
      },
    },
    '/analytics/body-progress': {
      get: {
        tags: ['Analytics'],
        summary: 'Body weight, BMI, measurements & progress photos',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Body progress data' } },
      },
    },
    '/analytics/revenue': {
      get: {
        tags: ['Analytics'],
        summary: 'Monthly revenue, member growth & plan distribution',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Revenue analytics' } },
      },
    },
    '/analytics/attendance': {
      get: {
        tags: ['Analytics'],
        summary: 'Daily attendance trend',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Attendance trend' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get user notifications and unread count',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notifications list' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Marked read' } },
      },
    },
    '/attendance/qr-token': {
      post: {
        tags: ['Attendance'],
        summary: 'Generate signed time-limited QR check-in token',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Signed QR token' } },
      },
    },
    '/attendance/check-in': {
      post: {
        tags: ['Attendance'],
        summary: 'Check in member via QR token or membership code',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Checked in' } },
      },
    },
    '/attendance/check-out': {
      post: {
        tags: ['Attendance'],
        summary: 'Check out member',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Checked out' } },
      },
    },
  },
};

