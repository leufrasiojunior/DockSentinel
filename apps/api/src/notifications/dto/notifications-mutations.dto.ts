import { ApiProperty } from "@nestjs/swagger"
import { z } from "zod"
import { OkResponseDto } from "../../common/dto/ok-response.dto"

export class DeleteNotificationsDto {
  @ApiProperty({
    description: "IDs das notificações a remover",
    type: [String],
    example: ["cm8abc123", "cm8def456"],
  })
  ids!: string[]
}

export const deleteNotificationsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
})

export class NotificationsAffectedResponseDto extends OkResponseDto {
  @ApiProperty({
    description: "Quantidade de registros afetados",
    example: 2,
  })
  affected!: number
}
