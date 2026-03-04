import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { NotificationsService } from "./notifications.service"

@Injectable()
export class NotificationsRetentionService {
  private readonly logger = new Logger(NotificationsRetentionService.name)

  constructor(private readonly notifications: NotificationsService) {}

  // diária às 03:00 (timezone do processo)
  @Cron("0 0 3 * * *")
  async runDailyCleanup() {
    try {
      const result = await this.notifications.cleanupExpiredBySettings()
      this.logger.log(`[retention] cleanup done removed=${result.removed}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`[retention] cleanup failed: ${message}`)
    }
  }
}
