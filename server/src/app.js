"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const swagger_1 = require("./config/swagger");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const sanitize_1 = require("./middleware/sanitize");
const admin_routes_1 = require("./modules/admin/admin.routes");
const ai_routes_1 = require("./modules/ai/ai.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const attendance_routes_1 = require("./modules/attendance/attendance.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
const gym_routes_1 = require("./modules/gyms/gym.routes");
const health_routes_1 = require("./modules/health/health.routes");
const member_routes_1 = require("./modules/members/member.routes");
const membership_routes_1 = require("./modules/memberships/membership.routes");
const message_routes_1 = require("./modules/messages/message.routes");
const notification_routes_1 = require("./modules/notifications/notification.routes");
const nutrition_routes_1 = require("./modules/nutrition/nutrition.routes");
const payment_routes_1 = require("./modules/payments/payment.routes");
const trainer_routes_1 = require("./modules/trainers/trainer.routes");
const workout_routes_1 = require("./modules/workouts/workout.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || env_1.env.corsOriginsList.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('CORS policy rejected origin'));
        },
        credentials: true,
    }));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({
        limit: '1mb',
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    app.use((0, cookie_parser_1.default)());
    app.use(sanitize_1.sanitizeRequest);
    if (env_1.env.NODE_ENV !== 'test') {
        app.use((0, pino_http_1.default)({
            logger: logger_1.logger,
        }));
    }
    app.use(rateLimiter_1.apiRateLimiter);
    // Root & versioned health endpoints
    app.use('/health', health_routes_1.healthRoutes);
    app.use(`${env_1.env.API_PREFIX}/health`, health_routes_1.healthRoutes);
    // OpenAPI documentation
    app.use(`${env_1.env.API_PREFIX}/docs`, swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.openApiSpec));
    // Versioned API modules
    app.use(`${env_1.env.API_PREFIX}/auth`, auth_routes_1.authRoutes);
    app.use(`${env_1.env.API_PREFIX}/gyms/:id/members`, member_routes_1.gymMembersRoutes);
    app.use(`${env_1.env.API_PREFIX}/gyms/:id/trainers`, trainer_routes_1.gymTrainersRoutes);
    app.use(`${env_1.env.API_PREFIX}/gyms`, gym_routes_1.gymRoutes);
    app.use(`${env_1.env.API_PREFIX}/members`, member_routes_1.memberRoutes);
    app.use(`${env_1.env.API_PREFIX}/trainers`, trainer_routes_1.trainerRoutes);
    app.use(`${env_1.env.API_PREFIX}/membership-plans`, membership_routes_1.membershipPlanRoutes);
    app.use(`${env_1.env.API_PREFIX}/subscriptions`, membership_routes_1.subscriptionRoutes);
    app.use(`${env_1.env.API_PREFIX}/payments`, payment_routes_1.paymentRoutes);
    app.use(`${env_1.env.API_PREFIX}/exercises`, workout_routes_1.exerciseRoutes);
    app.use(`${env_1.env.API_PREFIX}/workouts`, workout_routes_1.workoutRoutes);
    app.use(`${env_1.env.API_PREFIX}/workout-sessions`, workout_routes_1.workoutSessionRoutes);
    app.use(`${env_1.env.API_PREFIX}/nutrition`, nutrition_routes_1.nutritionRoutes);
    app.use(`${env_1.env.API_PREFIX}/ai`, ai_routes_1.aiRoutes);
    app.use(`${env_1.env.API_PREFIX}/analytics`, analytics_routes_1.analyticsRoutes);
    app.use(`${env_1.env.API_PREFIX}/admin`, admin_routes_1.adminRoutes);
    app.use(`${env_1.env.API_PREFIX}/notifications`, notification_routes_1.notificationRoutes);
    app.use(`${env_1.env.API_PREFIX}/attendance`, attendance_routes_1.attendanceRoutes);
    app.use(`${env_1.env.API_PREFIX}/messages`, message_routes_1.messageRoutes);
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
