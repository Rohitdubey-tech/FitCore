import fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  const testUri = process.env.MONGODB_TEST_URI;
  if (testUri) {
    await mongoose.connect(testUri);
    return;
  }

  const localMongod = '/opt/homebrew/bin/mongod';
  const binaryOption =
    process.env.MONGOMS_SYSTEM_BINARY || (fs.existsSync(localMongod) ? localMongod : undefined);

  mongoServer = await MongoMemoryServer.create(
    binaryOption ? { binary: { systemBinary: binaryOption } } : undefined
  );
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
