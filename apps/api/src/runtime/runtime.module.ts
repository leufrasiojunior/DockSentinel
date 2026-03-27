import { Module } from "@nestjs/common"
import { CryptoModule } from "../crypto/crypto.module"
import { DockerModule } from "../docker/docker.module"
import { EnvironmentsModule } from "../environments/environments.module"
import { LocalRuntimeClientService } from "./local-runtime-client.service"
import { RemoteRuntimeClientService } from "./remote-runtime-client.service"
import { RuntimeService } from "./runtime.service"

@Module({
  imports: [DockerModule, EnvironmentsModule, CryptoModule],
  providers: [LocalRuntimeClientService, RemoteRuntimeClientService, RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
