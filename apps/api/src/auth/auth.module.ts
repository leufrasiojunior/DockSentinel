import { Module } from "@nestjs/common"
import { AuthController } from "./auth.controller"
import { SettingsModule } from "../settings/settings.module"
import { AuthService } from "./auth.service"
import { SessionService } from "./session.service"
import { CryptoService } from "src/crypto/crypto.service"

@Module({
  imports: [SettingsModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, CryptoService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
