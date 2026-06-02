import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export interface ProcessComparisonJobData {
  comparisonId: string;
  videoUrls: string[];
}

export const QUEUE_NAME = 'video-comparison-queue';

export const videoComparisonQueue = new Queue(QUEUE_NAME, {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 1, // Minimize retries for expensive AI operations
    removeOnComplete: true,
    removeOnFail: false,
  },
});
