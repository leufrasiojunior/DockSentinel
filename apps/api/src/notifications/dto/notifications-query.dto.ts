import { ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class NotificationsQueryDto {
  @ApiPropertyOptional({ description: "Retorna eventos após este id" })
  @IsOptional()
  @IsString()
  afterId?: string

  @ApiPropertyOptional({ description: "Máximo de itens", default: 20 })
  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number | string
}
