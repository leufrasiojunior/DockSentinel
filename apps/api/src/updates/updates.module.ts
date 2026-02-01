import { Module } from "@nestjs/common";
import { UpdatesQueueService } from "./updates.queue.service";
import { UpdatesController } from "./updates.controller";
import { DockerModule } from "../docker/docker.module";

@Module({
  imports: [DockerModule],
  providers: [UpdatesQueueService],
  controllers: [UpdatesController],
})
export class UpdatesModule {}
