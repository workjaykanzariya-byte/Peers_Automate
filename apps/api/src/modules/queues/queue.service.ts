import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redisConnection: Redis;
  private queues: Map<string, Queue> = new Map();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.redisConnection = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisConnection.on('error', (err) => {
      this.logger.warn(`Redis BullMQ connection notice: ${err.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing BullMQ Queues with Redis connection...');
    const queueNames = [
      'campaign-dispatch',
      'contact-import',
      'webhook-outbound',
      'template-sync',
      'message-status',
    ];

    const options: QueueOptions = {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    };

    for (const name of queueNames) {
      const q = new Queue(name, options);
      this.queues.set(name, q);
    }
    this.logger.log(`Initialized ${this.queues.size} BullMQ queues successfully.`);
  }

  async onModuleDestroy() {
    this.logger.log('Closing BullMQ queues and Redis connections...');
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
    }
    await this.redisConnection.quit();
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob(queueName: string, jobName: string, data: any, jobId?: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return queue.add(jobName, data, {
      jobId, // Idempotency key for deduplication
    });
  }
}
