import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { z } from "zod"

export class EnvironmentDto {
  @ApiProperty({ example: "local" })
  id!: string

  @ApiProperty({ enum: ["local", "remote"], example: "remote" })
  kind!: "local" | "remote"

  @ApiProperty({ example: "Homelab" })
  name!: string

  @ApiPropertyOptional({ example: "http://192.168.1.50:45873", nullable: true })
  baseUrl?: string | null

  @ApiProperty({ example: true })
  hasToken!: boolean

  @ApiPropertyOptional({ example: "2.4.1", nullable: true })
  agentVersion?: string | null

  @ApiPropertyOptional({ example: "28.0.1", nullable: true })
  dockerVersion?: string | null

  @ApiPropertyOptional({ example: "2026-03-24T20:30:00.000Z", nullable: true })
  lastSeenAt?: Date | null

  @ApiPropertyOptional({ example: null, nullable: true })
  lastError?: string | null

  @ApiProperty({ enum: ["online", "offline"], example: "online" })
  status!: "online" | "offline"

  @ApiProperty({ example: "2026-03-24T20:00:00.000Z" })
  createdAt!: Date

  @ApiProperty({ example: "2026-03-24T20:00:00.000Z" })
  updatedAt!: Date
}

export class EnvironmentListDto {
  @ApiProperty({ type: EnvironmentDto, isArray: true })
  items!: EnvironmentDto[]
}

export class AgentInfoDto {
  @ApiProperty({ example: "agent" })
  mode!: "agent"

  @ApiProperty({ example: "2.4.1" })
  agentVersion!: string

  @ApiPropertyOptional({ example: "28.0.1", nullable: true })
  dockerVersion?: string | null

  @ApiPropertyOptional({ example: "1.48", nullable: true })
  dockerApiVersion?: string | null

  @ApiPropertyOptional({ example: "docker-host", nullable: true })
  dockerHost?: string | null
}

export class RemoteEnvironmentMutationDto {
  @ApiProperty({ type: EnvironmentDto })
  environment!: EnvironmentDto

  @ApiProperty({ example: "dsa_very_secret_token" })
  agentToken!: string

  @ApiProperty({
    example:
      "docker run -d --name docksentinel-agent --restart unless-stopped -p 45873:45873 -e PORT=45873 -e DOCKSENTINEL_AGENT_TOKEN='dsa_very_secret_token' -v /var/run/docker.sock:/var/run/docker.sock leufrasiojunior/docksentinel-agent:latest",
  })
  installCommand!: string
}

export class RemoteEnvironmentTestDto {
  @ApiProperty({ type: EnvironmentDto })
  environment!: EnvironmentDto

  @ApiProperty({ type: AgentInfoDto })
  info!: AgentInfoDto
}

export class CreateRemoteEnvironmentDto {
  @ApiProperty({ example: "Homelab" })
  name!: string

  @ApiProperty({ example: "192.168.1.50" })
  baseUrl!: string
}

export class UpdateRemoteEnvironmentDto {
  @ApiPropertyOptional({ example: "Homelab" })
  name?: string

  @ApiPropertyOptional({ example: "http://192.168.1.50:45873" })
  baseUrl?: string
}

export const createRemoteEnvironmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  baseUrl: z.string().trim().min(1).max(300),
})

export const updateRemoteEnvironmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  baseUrl: z.string().trim().min(1).max(300).optional(),
}).refine((value) => value.name !== undefined || value.baseUrl !== undefined, {
  message: "name or baseUrl is required",
})

export type CreateRemoteEnvironmentInput = z.infer<typeof createRemoteEnvironmentSchema>
export type UpdateRemoteEnvironmentInput = z.infer<typeof updateRemoteEnvironmentSchema>
