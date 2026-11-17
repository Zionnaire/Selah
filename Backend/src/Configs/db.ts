import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../Utils/logger';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  logger.info('MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** 1 means connected. Used by the readiness probe. */
export const databaseReady = (): boolean => mongoose.connection.readyState === 1;
