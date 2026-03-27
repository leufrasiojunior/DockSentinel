import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common"
import { ApiBody, ApiTags } from "@nestjs/swagger"
import { OkResponseDto } from "../common/dto/ok-response.dto"
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import {
  DeleteNotificationsDto,
  deleteNotificationsSchema,
} from "../notifications/dto/notifications-mutations.dto"
import { NotificationsQueryDto } from "../notifications/dto/notifications-query.dto"
import { NotificationsService } from "../notifications/notifications.service"

@ApiTags("Environment Notifications")
@Controller("environments/:environmentId/notifications")
export class EnvironmentNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @Param("environmentId") environmentId: string,
    @Query() query: NotificationsQueryDto,
  ) {
    const take =
      typeof query.take === "string"
        ? Number(query.take)
        : typeof query.take === "number"
          ? query.take
          : undefined

    return this.notifications.listForClient({
      environmentId,
      afterId: query.afterId,
      take,
    })
  }

  @Post(":id/read")
  async markRead(@Param("id") id: string) {
    return this.notifications.markRead(id)
  }

  @Post(":id/unread")
  async markUnread(@Param("id") id: string) {
    return this.notifications.markUnread(id)
  }

  @Post("read-all")
  async markAllRead(@Param("environmentId") environmentId: string) {
    return this.notifications.markAllRead(environmentId)
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    return this.notifications.deleteOne(id)
  }

  @Post("delete-many")
  @ApiBody({ type: DeleteNotificationsDto })
  async deleteMany(
    @Body(new ZodValidationPipe(deleteNotificationsSchema))
    body: DeleteNotificationsDto,
  ) {
    return this.notifications.deleteMany(body.ids)
  }
}
