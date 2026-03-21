import { Module } from "@nestjs/common"
import { CryptoModule } from "../crypto/crypto.module"
import { MailModule } from "../mail/mail.module"
import { PrismaModule } from "../prisma/prisma.module"
import { SettingsModule } from "../settings/settings.module"
import { NotificationsController } from "./notifications.controller"
import { NotificationsRepository } from "./notifications.repository"
import { NotificationsRetentionService } from "./notifications-retention.service"
import { NotificationsService } from "./notifications.service"

@Module({
  imports: [PrismaModule, SettingsModule, CryptoModule, MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService, NotificationsRetentionService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
