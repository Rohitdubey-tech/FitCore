"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const response_1 = require("../../utils/response");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    const db = (0, database_1.getDatabaseHealth)();
    const isHealthy = db.status === 'connected';
    return (0, response_1.sendSuccess)(res, {
        service: 'fitcore-api',
        status: isHealthy ? 'ok' : 'degraded',
        environment: env_1.env.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        dependencies: {
            mongodb: db,
        },
    }, { statusCode: isHealthy ? 200 : 503 });
});
exports.healthRoutes = router;
