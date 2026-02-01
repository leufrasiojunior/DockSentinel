import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class RecreateDto {
  @ApiPropertyOptional({
    description: "New image to use (default: current container image).",
    example: "nginx:latest",
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: "Force recreate even if already up-to-date.",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({
    description: "Pull image before recreating (recommended).",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  pull?: boolean;
}
