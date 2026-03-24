import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common"
import {
  ApiBody,
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
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import {
  DeleteNotificationsDto,
  deleteNotificationsSchema,
  NotificationsAffectedResponseDto,
} from "./dto/notifications-mutations.dto"

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

  @Post(":id/unread")
  @ApiOperation({ summary: "Marcar notificação como não lida" })
  @ApiParam({ name: "id", description: "ID da notificação" })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiNotFoundResponse({ description: "Notificação não encontrada." })
  async markUnread(@Param("id") id: string) {
    return this.notifications.markUnread(id)
  }

  @Post("read-all")
  @ApiOperation({ summary: "Marcar todas notificações como lidas" })
  @ApiOkResponse({ type: NotificationsAffectedResponseDto })
  async markAllRead() {
    return this.notifications.markAllRead()
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remover notificação" })
  @ApiParam({ name: "id", description: "ID da notificação" })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiNotFoundResponse({ description: "Notificação não encontrada." })
  async deleteOne(@Param("id") id: string) {
    return this.notifications.deleteOne(id)
  }

  @Post("delete-many")
  @ApiOperation({ summary: "Remover múltiplas notificações" })
  @ApiBody({ type: DeleteNotificationsDto })
  @ApiOkResponse({ type: NotificationsAffectedResponseDto })
  async deleteMany(
    @Body(new ZodValidationPipe(deleteNotificationsSchema))
    body: DeleteNotificationsDto,
  ) {
    return this.notifications.deleteMany(body.ids)
  }
}
