process.env.AUTH_MODE = "none" // fallback ENV
process.env.ADMIN_PASSWORD = "MyStrongPass123"
process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"

import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import cookieParser from "cookie-parser"
import { AppModule } from "../src/app.module"

describe("AuthMode from DB (e2e)", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.use(cookieParser(process.env.DOCKSENTINEL_SECRET))
    await app.init()
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

    await agent.post("/auth/login").send({ password: "MyStrongPass123" }).expect((r) => {
      expect([200, 201]).toContain(r.status)
    })

    await agent.get("/settings").expect(200)
  })
})
