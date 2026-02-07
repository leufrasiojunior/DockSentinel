import { NestFactory } from '@nestjs/core';
import { Logger, type LogLevel } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

function ensureMigrations(config: ConfigService<Env>, logger: Logger) {
  const auto = config.get('AUTO_MIGRATE', { infer: true });
  if (!auto) {
    logger.log('AUTO_MIGRATE=false (skipping migrations)');
    return;
  }

  // garante pasta do sqlite (você usa ./data/docksentinel.db)
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });

  logger.log('AUTO_MIGRATE=true -> running Prisma migrations (deploy)...');

  execSync('npx prisma migrate deploy --config=prisma.config.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  logger.log('Migrations applied (or already up-to-date).');
}

/**
 * Bootstrapping da API.
 * Aqui é o “ponto de entrada” do backend.
 *
 * Referência oficial do logger e do bootstrap:
 * - Logger (Nest): https://docs.nestjs.com/techniques/logger :contentReference[oaicite:3]{index=3}
 */
async function bootstrap() {
  /**
   * Logger “raiz” (tag/contexto = "Bootstrap").
   * Você vai ver esse contexto nos logs.
   */
  const logger = new Logger('Bootstrap');

  /**
   * bufferLogs: true
   * - Faz o Nest “segurar” logs durante o bootstrap até o logger estar pronto.
   * Isso evita perder logs iniciais em casos de custom logger mais tarde.
   */
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  /**
   * ConfigService agora está disponível globalmente.
   * Ele já passou pela validação do Zod no boot.
   */
  const config = app.get<ConfigService<Env>>(ConfigService);
  const port = config.getOrThrow('PORT', { infer: true });

  const secret = config.getOrThrow('DOCKSENTINEL_SECRET', { infer: true });

  // ✅ CORS (precisa vir antes do listen)
  const corsOriginsRaw = config.getOrThrow('CORS_ORIGINS', { infer: true });
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsAllowAll = corsOrigins.includes('*');

  app.enableCors({
    origin: (origin, cb) => {
      // requests sem Origin (curl, server-to-server) devem passar
      if (!origin) return cb(null, true);
      if (corsAllowAll) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });


  /**
   * cookieParser(secret):
   * - habilita cookies assinados (req.signedCookies)
   * - vamos usar isso para evitar cookie adulterado
   *
   * Doc oficial Nest Cookies: :contentReference[oaicite:7]{index=7}
   */
  app.use(cookieParser(secret));

  /**
   * Níveis de log do Nest:
   * - 'log', 'error', 'warn', 'debug', 'verbose'
   *
   * Aqui a gente controla via ENV LOG_LEVEL.
   * Por enquanto é simples (POC real), depois vamos usar @nestjs/config.
   */
  const level = config.getOrThrow('LOG_LEVEL', { infer: true });

  // Mapeia seu padrão (error|warn|info|debug) para níveis do Nest.
  const nestLevels: LogLevel[] =
    level === 'error'
      ? ['error']
      : level === 'warn'
        ? ['error', 'warn']
        : level === 'debug'
          ? ['error', 'warn', 'log', 'debug', 'verbose']
          : ['error', 'warn', 'log']; // "info" (default)

  app.useLogger(nestLevels);

  /**
   * shutdown hooks:
   * - Ajuda o app a encerrar corretamente em Docker/Compose (SIGTERM).
   * - Importante quando a gente tiver scheduler, jobs, etc.
   */
  app.enableShutdownHooks();
  const swaggerEnabled = config.get('SWAGGER_ENABLED', { infer: true });
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DockSentinel API')
      .setDescription(
        'API do DockSentinel (containers, updates, auth, settings)',
      )
      .setVersion('1.0.0')
      .build();

    //Verifricar as migrations
    const config = app.get<ConfigService<Env>>(ConfigService);

    ensureMigrations(config, logger);

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
