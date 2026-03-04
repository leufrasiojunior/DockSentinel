import { Controller, Get, Param, Post, Query } from "@nestjs/common"
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger"
import { NotificationsService } from "./notifications.service"
import { NotificationsQueryDto } from "./dto/notifications-query.dto"
import { NotificationEventListDto } from "./dto/notification-event.dto"
import { OkResponseDto } from "../common/dto/ok-response.dto"

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Listar notificações in-app" })
  @ApiQuery({ name: "afterId", required: false })
  @ApiQuery({ name: "take", required: false, example: 20 })
  @ApiOkResponse({ type: NotificationEventListDto })
  async list(@Query() query: NotificationsQueryDto) {
    const take =
      typeof query.take === "string"
        ? Number(query.take)
        : typeof query.take === "number"
          ? query.take
          : undefined
    return this.notifications.listForClient({
      afterId: query.afterId,
      take,
    })
  }

  @Post(":id/read")
  @ApiOperation({ summary: "Marcar notificação como lida" })
  @ApiParam({ name: "id", description: "ID da notificação" })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiNotFoundResponse({ description: "Notificação não encontrada." })
  async markRead(@Param("id") id: string) {
    return this.notifications.markRead(id)
  }

  @Post("read-all")
  @ApiOperation({ summary: "Marcar todas notificações como lidas" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        affected: { type: "number", example: 10 },
      },
    },
  })
  async markAllRead() {
    return this.notifications.markAllRead()
  }
}
