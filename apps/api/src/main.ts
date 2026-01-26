import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  const nestLevels =
    level === 'error'
      ? ['error']
      : level === 'warn'
        ? ['error', 'warn']
        : level === 'debug'
          ? ['error', 'warn', 'log', 'debug', 'verbose']
          : ['error', 'warn', 'log']; // "info" (default)

  app.useLogger(nestLevels as any);

  /**
   * shutdown hooks:
   * - Ajuda o app a encerrar corretamente em Docker/Compose (SIGTERM).
   * - Importante quando a gente tiver scheduler, jobs, etc.
   */
  app.enableShutdownHooks();
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('DockSentinel API')
      .setDescription(
        'API do DockSentinel (containers, updates, auth, setup, settings)',
      )
      .setVersion('1.0.0')
      // Se quiser, você pode descrever o cookie de sessão na doc.
      // (Nem sempre é necessário pro Postman, mas ajuda o humano.)
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document, {
      // ✅ esses dois facilitam MUITO export/import:
      jsonDocumentUrl: 'docs-json',
      // se sua versão suportar:
      // yamlDocumentUrl: "docs-yaml",
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);

  logger.log(`DockSentinel API listening on http://localhost:${port}`);
  logger.log(`LOG_LEVEL=${level} -> NestLevels=${JSON.stringify(nestLevels)}`);
}

bootstrap();
