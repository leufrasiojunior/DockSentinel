import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class RecreateDto {
  @ApiPropertyOptional({
    description: "Nova imagem para usar (padrão: imagem atual do container).",
    example: "nginx:latest",
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: "Força recriar mesmo se já estiver atualizado.",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({
    description: "Faz pull da imagem antes de recriar (recomendado).",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  pull?: boolean;
}
