import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Resilient DNS resolver on native Node.js dns module to bypass local ISP DNS hijacks (e.g. facebomk.com poisoning)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nativeDns = require('dns');
try {
  const originalLookup = nativeDns.lookup;
  Object.defineProperty(nativeDns, 'lookup', {
    value: (hostname: string, options: any, callback: any) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      if (hostname === 'graph.facebook.com') {
        return originalLookup('57.144.224.141', options, callback);
      }
      return originalLookup(hostname, options, callback);
    },
    writable: true,
    configurable: true,
  });
} catch {
  // Ignore if already defined
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Middlewares
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cookieParser = require('cookie-parser');
  const cookieMiddleware = typeof cookieParser === 'function' ? cookieParser : cookieParser.default;
  if (typeof cookieMiddleware === 'function') {
    app.use(cookieMiddleware());
  }

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Correlation-Id'],
  });

  // Global Prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global Pipes & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('DOOT Multi-Tenant WhatsApp SaaS API')
    .setDescription('Official REST API documentation for DOOT WhatsApp Communication & Marketing Platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'tenant-id')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 DOOT Backend API successfully started on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📘 OpenAPI Swagger Documentation available at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('BOOTSTRAP_ERROR:', err);
  process.exit(1);
});
