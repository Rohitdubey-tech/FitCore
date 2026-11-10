"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
async function bootstrap() {
    await (0, database_1.connectDatabase)();
    const app = (0, app_1.createApp)();
    const server = app.listen(env_1.env.PORT, () => {
        logger_1.logger.info({ port: env_1.env.PORT, apiPrefix: env_1.env.API_PREFIX, env: env_1.env.NODE_ENV }, `FITCORE API server listening on http://localhost:${env_1.env.PORT}`);
    });
    const shutdown = async (signal) => {
        logger_1.logger.info({ signal }, 'Graceful shutdown initiated');
        server.close(async () => {
            await (0, database_1.disconnectDatabase)();
            process.exit(0);
        });
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
bootstrap().catch((err) => {
    logger_1.logger.fatal({ err }, 'Failed to start FITCORE server');
    process.exit(1);
});
