process.env.AUTH_MODE = "none" // fallback ENV
process.env.ADMIN_PASSWORD = "MyStrongPass123"
process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"

import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import { PrismaService } from "../src/prisma/prisma.service"
import { createTestApp } from "./create-test-app"

describe("AuthMode from DB (e2e)", () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const created = await createTestApp()
    app = created.app
    prisma = created.moduleFixture.get(PrismaService)
  })

  beforeEach(async () => {
    await prisma.client.globalSettings.upsert({
      where: { id: 1 },
      create: { id: 1, authMode: "none", defaultLocale: "pt-BR" },
      update: { authMode: "none", defaultLocale: "pt-BR" },
    })
  })

afterAll(async () => {
  if (app) await app.close()
})


  it("should allow /settings when DB authMode is none", async () => {
    // força settings no DB para none (via endpoint)
    await request(app.getHttpServer())
      .put("/settings")
      .send({ authMode: "none" })
      .expect(200)

    await request(app.getHttpServer()).get("/settings").expect(200)
  })

  it("should deny /settings when DB authMode is password", async () => {
    // muda no DB para password
    await request(app.getHttpServer())
      .put("/settings")
      .send({ authMode: "password", adminPassword: "MyStrongPass123" })
      .expect(200)

    const res = await request(app.getHttpServer()).get("/settings")
    expect([401, 403]).toContain(res.status)
  })

  it("should allow /settings after login (cookie) when authMode is password", async () => {
    const agent = request.agent(app.getHttpServer())

    await request(app.getHttpServer())
      .put("/settings")
      .send({ authMode: "password", adminPassword: "MyStrongPass123" })
      .expect(200)

    await agent.post("/auth/login").send({ password: "MyStrongPass123" }).expect((r) => {
      expect([200, 201]).toContain(r.status)
    })

    await agent.get("/settings").expect(200)
  })
})
