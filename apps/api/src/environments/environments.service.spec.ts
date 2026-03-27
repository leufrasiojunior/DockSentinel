jest.mock("../updates/updates.repository", () => ({
  UpdatesRepository: class UpdatesRepository {},
}))

jest.mock("../updates/updates.scheduler.repository", () => ({
  UpdatesSchedulerRepository: class UpdatesSchedulerRepository {},
}))

jest.mock("../notifications/notifications.service", () => ({
  NotificationsService: class NotificationsService {},
}))

import { EnvironmentsService } from "./environments.service"

describe("EnvironmentsService (unit)", () => {
  it("returns an install command that replaces an existing agent container", async () => {
    const createdAt = new Date("2026-03-27T00:00:00.000Z")
    const repo = {
      countRemote: jest.fn().mockResolvedValue(0),
      findByName: jest.fn().mockResolvedValue(null),
      findRemoteByBaseUrl: jest.fn().mockResolvedValue(null),
      createRemote: jest.fn().mockResolvedValue({
        id: "env-1",
        kind: "remote",
        name: "Remote host",
        baseUrl: "http://192.168.1.50:45873",
        agentTokenEnc: null,
        pendingBootstrapTokenEnc: "encrypted-token",
        rotationState: "ready_to_pair",
        agentVersion: null,
        dockerVersion: null,
        lastSeenAt: null,
        lastError: null,
        connectivityStatus: "offline",
        offlineNotifiedAt: null,
        createdAt,
        updatedAt: createdAt,
      }),
    }
    const crypto = {
      encrypt: jest.fn().mockReturnValue("encrypted-token"),
    }
    const config = {
      get: jest.fn().mockReturnValue(3),
    }
    const schedulerRepo = {
      ensureEnvironmentConfig: jest.fn().mockResolvedValue(undefined),
    }

    const service = new EnvironmentsService(
      repo as any,
      crypto as any,
      config as any,
      {} as any,
      schedulerRepo as any,
      {} as any,
      {} as any,
    )

    const result = await service.createRemoteEnvironment({
      name: "Remote host",
      baseUrl: "192.168.1.50",
    })

    expect(result.installCommand).toBe(
      "docker rm -f docksentinel-agent >/dev/null 2>&1 || true && docker run -d --name docksentinel-agent --restart unless-stopped -p 45873:45873 -e PORT=45873 -v /var/run/docker.sock:/var/run/docker.sock -v /opt/docksentinel-agent:/var/lib/docksentinel-agent leufrasiojunior/docksentinelagent:latest",
    )
    expect(schedulerRepo.ensureEnvironmentConfig).toHaveBeenCalledWith("env-1", "Remote host")
  })
})
