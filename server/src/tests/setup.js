"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
let mongoServer;
beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI;
    if (testUri) {
        await mongoose_1.default.connect(testUri);
        return;
    }
    const localMongod = '/opt/homebrew/bin/mongod';
    const binaryOption = process.env.MONGOMS_SYSTEM_BINARY || (fs_1.default.existsSync(localMongod) ? localMongod : undefined);
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create(binaryOption ? { binary: { systemBinary: binaryOption } } : undefined);
    const uri = mongoServer.getUri();
    await mongoose_1.default.connect(uri);
});
afterEach(async () => {
    if (mongoose_1.default.connection.readyState === 1) {
        const collections = mongoose_1.default.connection.collections;
        for (const key of Object.keys(collections)) {
            await collections[key].deleteMany({});
        }
    }
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});
