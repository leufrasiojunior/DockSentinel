import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { validateEnv } from "./env.schema"

/**
 * Centraliza a configuração do app.
 *
 * ConfigModule (oficial do Nest):
 * 
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      // torna ConfigService disponível em todo lugar, sem precisar importar sempre
      validate: validateEnv // valida o ENV no boot (se falhar, app não inicia)
    }),
  ],
})
export class AppConfigModule {}
