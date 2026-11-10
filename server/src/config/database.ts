import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });

  logger.info({ db: mongoose.connection.name }, 'Connected to MongoDB');
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

export function getDatabaseHealth(): { status: 'connected' | 'disconnected' | 'connecting'; readyState: number } {
  const state = mongoose.connection.readyState;
  const status = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected';
  return { status, readyState: state };
}
