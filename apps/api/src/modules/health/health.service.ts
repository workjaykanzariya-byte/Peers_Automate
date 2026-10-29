import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD');

    try {
      this.redisClient = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });
      this.redisClient.on('error', (e) => {
        this.logger.debug(`Redis health check connection: ${e.message}`);
      });
    } catch (e: any) {
      this.logger.error(`Redis init error: ${e.message}`);
    }
  }

  async checkHealth() {
    // 1. PostgreSQL check
    let postgresStatus = 'down';
    let postgresLatencyMs = 0;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      postgresLatencyMs = Date.now() - start;
      postgresStatus = 'up';
    } catch (error: any) {
      this.logger.error(`PostgreSQL health check failed: ${error.message}`);
    }

    // 2. Redis check
    let redisStatus = 'down';
    let redisLatencyMs = 0;
    try {
      if (this.redisClient) {
        const start = Date.now();
        if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connecting') {
          await this.redisClient.connect();
        }
        const pong = await this.redisClient.ping();
        if (pong === 'PONG') {
          redisLatencyMs = Date.now() - start;
          redisStatus = 'up';
        }
      }
    } catch (error: any) {
      this.logger.error(`Redis health check failed: ${error.message}`);
    }

    const isHealthy = postgresStatus === 'up' && redisStatus === 'up';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: postgresStatus,
          latencyMs: postgresLatencyMs,
          engine: 'PostgreSQL 18',
          database: 'DOOT',
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
          engine: 'Redis 8',
        },
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
