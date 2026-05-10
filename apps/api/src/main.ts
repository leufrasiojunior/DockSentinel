import { NestFactory } from '@nestjs/core';
import { Logger, type LogLevel } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  configureApplication,
  ensureMigrations,
  resolveNestLogLevels,
} from './bootstrap/configure-app';

/**
 * Bootstrapping da API.
 * Aqui é o “ponto de entrada” do backend.
 *
 * Referência oficial do logger e do bootstrap:
 * - Logger (Nest): https://docs.nestjs.com/techniques/logger :contentReference[oaicite:3]{index=3}
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const { config } = await configureApplication(app);
  const port = config.getOrThrow('PORT', { infer: true });
  const level = config.getOrThrow('LOG_LEVEL', { infer: true });
  const nestLevels: LogLevel[] = resolveNestLogLevels(level);
  app.useLogger(nestLevels);
  app.enableShutdownHooks();

  ensureMigrations(config, logger);
  const swaggerEnabled = config.get('SWAGGER_ENABLED', { infer: true });
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DockSentinel API')
      .setDescription(
        'API do DockSentinel (containers, updates, auth, settings)',
      )
      .setVersion('1.0.0')
      .build();

    //Swagger
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log('Swagger ENABLED at /docs');
    logger.log('Import json schema in /docs-json');
  } else {
    logger.log('Swagger DISABLED (set SWAGGER_ENABLED=true if you want)');
  }

  await app.listen(port);

  logger.log(`DockSentinel API listening on http://localhost:${port}`);
  logger.log(`LOG_LEVEL=${level} -> NestLevels=${JSON.stringify(nestLevels)}`);
}

bootstrap();
