process.env.AUTH_MODE = "none"
process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"

import type { INestApplication } from "@nestjs/common"
import request from "supertest"
import type { TestingModule } from "@nestjs/testing"
import { CryptoService } from "../src/crypto/crypto.service"
import { PrismaService } from "../src/prisma/prisma.service"
import { createTestApp } from "./create-test-app"

describe("Backend sanitization (e2e)", () => {
  let app: INestApplication
  let moduleFixture: TestingModule
  let prisma: PrismaService
  let crypto: CryptoService

  beforeAll(async () => {
    const created = await createTestApp()
    app = created.app
    moduleFixture = created.moduleFixture
    prisma = moduleFixture.get(PrismaService)
    crypto = moduleFixture.get(CryptoService)
  })

  beforeEach(async () => {
    await prisma.client.notificationEvent.deleteMany()
    await prisma.client.updateJob.deleteMany()
    await prisma.client.updateSchedulerConfig.deleteMany({
      where: { environmentId: { not: "local" } },
    })
    await prisma.client.environment.deleteMany({
      where: { id: { not: "local" } },
    })
    await prisma.client.globalSettings.upsert({
      where: { id: 1 },
      create: { id: 1, authMode: "none", defaultLocale: "pt-BR" },
      update: { authMode: "none", defaultLocale: "pt-BR" },
    })
  })

  afterAll(async () => {
    if (app) await app.close()
  })

  it("scopes notification mutations and pagination by environment", async () => {
    const [envAOwn, envASecond, envBOther] = await Promise.all([
      prisma.client.notificationEvent.create({
        data: {
          environmentId: "env-a",
          environmentName: "Env A",
          type: "system_error",
          level: "error",
          title: "A1",
          message: "A1",
        },
      }),
      prisma.client.notificationEvent.create({
        data: {
          environmentId: "env-a",
          environmentName: "Env A",
          type: "system_error",
          level: "error",
          title: "A2",
          message: "A2",
        },
      }),
      prisma.client.notificationEvent.create({
        data: {
          environmentId: "env-b",
          environmentName: "Env B",
          type: "system_error",
          level: "error",
          title: "B1",
          message: "B1",
        },
      }),
    ])

    const wrongRead = await request(app.getHttpServer())
      .post(`/environments/env-a/notifications/${envBOther.id}/read`)
      .expect(404)

    expect(wrongRead.body).toMatchObject({
      statusCode: 404,
      code: "NOTIFICATION_NOT_FOUND",
    })

    await request(app.getHttpServer())
      .post(`/environments/env-a/notifications/${envAOwn.id}/read`)
      .expect(201)

    const readNotification = await prisma.client.notificationEvent.findUnique({
      where: { id: envAOwn.id },
    })
    expect(readNotification?.readAt).toBeTruthy()

    const deleteMany = await request(app.getHttpServer())
      .post("/environments/env-a/notifications/delete-many")
      .send({ ids: [envASecond.id, envBOther.id] })
      .expect(201)

    expect(deleteMany.body).toEqual({ ok: true, affected: 1 })

    const remainingEnvB = await prisma.client.notificationEvent.findUnique({
      where: { id: envBOther.id },
    })
    expect(remainingEnvB).not.toBeNull()

    const list = await request(app.getHttpServer())
      .get(`/environments/env-a/notifications`)
      .query({ afterId: envBOther.id, take: 10 })
      .expect(200)

    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0]).toMatchObject({
      id: envAOwn.id,
      environmentId: "env-a",
    })
  })

  it("scopes environment job detail by environmentId", async () => {
    const [jobA, jobB] = await Promise.all([
      prisma.client.updateJob.create({
        data: {
          environmentId: "env-a",
          environmentName: "Env A",
          status: "queued",
          container: "nginx-a",
        },
      }),
      prisma.client.updateJob.create({
        data: {
          environmentId: "env-b",
          environmentName: "Env B",
          status: "queued",
          container: "nginx-b",
        },
      }),
    ])

    const wrongJob = await request(app.getHttpServer())
      .get(`/environments/env-a/updates/jobs/${jobB.id}`)
      .expect(404)

    expect(wrongJob.body).toMatchObject({
      statusCode: 404,
      code: "UPDATE_JOB_NOT_FOUND",
    })

    const okJob = await request(app.getHttpServer())
      .get(`/environments/env-a/updates/jobs/${jobA.id}`)
      .expect(200)

    expect(okJob.body).toMatchObject({
      id: jobA.id,
      environmentId: "env-a",
    })
  })

  it("returns standardized upstream errors for remote runtime failures", async () => {
    await prisma.client.environment.create({
      data: {
        id: "remote-http-error",
        kind: "remote",
        name: "Remote HTTP Error",
        baseUrl: "http://127.0.0.1:9",
        agentTokenEnc: crypto.encrypt("token-123"),
        rotationState: "paired",
      },
    })

    const response = await request(app.getHttpServer())
      .get("/environments/remote-http-error/docker/containers")
      .expect(502)

    expect(response.body).toMatchObject({
      statusCode: 502,
      code: "REMOTE_AGENT_UNAVAILABLE",
      message: expect.any(String),
    })
  })

  it("keeps scheduler legacy and canonical routes aligned", async () => {
    const legacyConfig = await request(app.getHttpServer())
      .get("/updates/scheduler")
      .expect(200)

    const canonicalConfig = await request(app.getHttpServer())
      .get("/updates/scheduler/config")
      .expect(200)

    expect(legacyConfig.body).toEqual(canonicalConfig.body)

    const patchBody = {
      enabled: true,
      cronExpr: "*/15 * * * *",
      mode: "scan_only",
      scope: "all",
      scanLabelKey: "docksentinel.scan",
      updateLabelKey: "docksentinel.update",
    }

    const legacyUpdate = await request(app.getHttpServer())
      .put("/updates/scheduler")
      .send(patchBody)
      .expect(200)

    const canonicalUpdate = await request(app.getHttpServer())
      .patch("/updates/scheduler/config")
      .send(patchBody)
      .expect(200)

    expect(legacyUpdate.body).toMatchObject(patchBody)
    expect(canonicalUpdate.body).toMatchObject(patchBody)
    expect(legacyUpdate.body.environmentId).toBe(canonicalUpdate.body.environmentId)
    expect(legacyUpdate.body.environmentName).toBe(canonicalUpdate.body.environmentName)

    const status = await request(app.getHttpServer())
      .get("/updates/scheduler/status")
      .expect(200)

    const legacyStatus = await request(app.getHttpServer())
      .get("/updates/scheduler/scheduler")
      .expect(200)

    expect(status.body).toEqual(legacyStatus.body)
  })
})
