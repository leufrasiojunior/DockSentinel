import { Module } from "@nestjs/common"
import { PrismaService } from "./prisma.service"

/**
 * PrismaModule:
 * - fornece PrismaService para o resto da aplicação via DI.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
