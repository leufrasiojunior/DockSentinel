import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UpdatesQueueService } from "./updates.queue.service";

class CreateUpdateJobDto {
  container: string;
  image?: string;
  force?: boolean;
  pull?: boolean;
}

@ApiTags("updates")
@Controller("updates")
export class UpdatesController {
  constructor(private readonly queue: UpdatesQueueService) {}

  @Post()
  @ApiOperation({ summary: "Enqueue an update job" })
  @ApiBody({ type: CreateUpdateJobDto })
  @ApiResponse({ status: 201 })
  create(@Body() body: CreateUpdateJobDto) {
    const job = this.queue.createJob(body);
    return { jobId: job.id, status: job.status };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get update job status" })
  get(@Param("id") id: string) {
    const job = this.queue.getJob(id);
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  @Get()
  @ApiOperation({ summary: "List recent update jobs" })
  list(@Query("limit") limit?: string) {
    const n = limit ? Number(limit) : 30;
    return this.queue.listJobs(Number.isFinite(n) ? n : 30);
  }
}
