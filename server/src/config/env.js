"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(5001),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    MONGODB_URI: zod_1.z.string().min(1).default('mongodb://127.0.0.1:27017/fitcore'),
    REDIS_URL: zod_1.z.string().default('redis://127.0.0.1:6379'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173,http://localhost:8081'),
    JWT_ACCESS_SECRET: zod_1.z
        .string()
        .min(32)
        .default('fitcore_dev_access_secret_key_change_in_production_123456'),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(32)
        .default('fitcore_dev_refresh_secret_key_change_in_production_123456'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_ROUNDS: zod_1.z.coerce.number().int().min(8).max(14).default(10),
    AI_SERVICE_URL: zod_1.z.string().default('http://localhost:8000'),
    RAZORPAY_KEY_ID: zod_1.z.string().default('rzp_test_fitcore_dev'),
    RAZORPAY_KEY_SECRET: zod_1.z.string().default('fitcore_dev_razorpay_secret_key'),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().default('fitcore_dev_razorpay_webhook_secret'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsed.data.NODE_ENV === 'production') {
    if (parsed.data.JWT_ACCESS_SECRET.includes('change_in_production') ||
        parsed.data.JWT_REFRESH_SECRET.includes('change_in_production')) {
        console.error('FATAL: Production JWT secrets must be explicitly configured.');
        process.exit(1);
    }
}
exports.env = {
    ...parsed.data,
    corsOriginsList: parsed.data.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
};
