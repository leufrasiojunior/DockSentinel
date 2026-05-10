process.env.AUTH_MODE = "password"
process.env.ADMIN_PASSWORD = "MyStrongPass123"
process.env.SESSION_TTL_HOURS = "1"
process.env.SESSION_COOKIE_NAME = "ds_session"
process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"




import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import { PrismaService } from "../src/prisma/prisma.service"
import { createTestApp } from "./create-test-app"

/**
 * E2E de autenticação:
 * - usa Supertest agent para guardar cookies
 * - prova que /auth/login seta cookie e /auth/me passa depois
 */
describe("Auth (e2e)", () => {
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

    await request(app.getHttpServer())
      .put("/settings")
      .send({ authMode: "password", adminPassword: "MyStrongPass123" })
      .expect(200)
  })

afterAll(async () => {
  if (app) await app.close()
})


  it("should deny /auth/me before login", async () => {
    const res = await request(app.getHttpServer()).get("/auth/me")
    expect([401, 403]).toContain(res.status)
  })

  it("should reject login with wrong password", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ password: "wrong" })

    expect(res.status).toBe(401)
  })

  it("should login and access /auth/me with session cookie", async () => {
    const agent = request.agent(app.getHttpServer())

    const loginRes = await agent
      .post("/auth/login")
      .send({ password: "MyStrongPass123" })

    // pode ser 200 ou 201
    expect([200, 201]).toContain(loginRes.status)

    const meRes = await agent.get("/auth/me")
    expect(meRes.status).toBe(200)
    expect(meRes.body).toEqual({ authenticated: true })
  })
})
