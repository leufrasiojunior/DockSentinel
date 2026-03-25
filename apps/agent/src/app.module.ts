import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { AgentAuthGuard } from "./auth/agent-auth.guard"
import { DockerModule } from "./docker/docker.module"

@Module({
  imports: [DockerModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AgentAuthGuard,
    },
  ],
})
export class AppModule {}
