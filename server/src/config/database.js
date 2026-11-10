"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.getDatabaseHealth = getDatabaseHealth;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("./logger");
async function connectDatabase(uri = env_1.env.MONGODB_URI) {
    if (mongoose_1.default.connection.readyState === 1) {
        return;
    }
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(uri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
    });
    logger_1.logger.info({ db: mongoose_1.default.connection.name }, 'Connected to MongoDB');
}
async function disconnectDatabase() {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.disconnect();
        logger_1.logger.info('Disconnected from MongoDB');
    }
}
function getDatabaseHealth() {
    const state = mongoose_1.default.connection.readyState;
    const status = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected';
    return { status, readyState: state };
}
