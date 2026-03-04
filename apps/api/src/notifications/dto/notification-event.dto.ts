import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class NotificationEventDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ enum: ["in_app"], example: "in_app" })
  channel!: "in_app"

  @ApiProperty({
    enum: ["job_success", "job_failed", "scan_info", "scan_error", "system_error"],
    example: "job_success",
  })
  type!: "job_success" | "job_failed" | "scan_info" | "scan_error" | "system_error"

  @ApiProperty({ enum: ["info", "error"], example: "info" })
  level!: "info" | "error"

  @ApiProperty()
  title!: string

  @ApiProperty()
  message!: string

  @ApiProperty({ example: "2026-03-03T12:00:00.000Z" })
  createdAt!: string

  @ApiPropertyOptional({ nullable: true, example: "2026-03-03T12:05:00.000Z" })
  readAt!: string | null

  @ApiPropertyOptional({
    description: "Metadados estruturados da notificação",
    type: "object",
    additionalProperties: true,
  })
  meta?: Record<string, unknown>
}

export class NotificationEventListDto {
  @ApiProperty({ type: NotificationEventDto, isArray: true })
  items!: NotificationEventDto[]
}
