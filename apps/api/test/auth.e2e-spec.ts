process.env.AUTH_MODE = "password"
process.env.ADMIN_PASSWORD = "MyStrongPass123"
process.env.SESSION_TTL_HOURS = "1"
process.env.SESSION_COOKIE_NAME = "ds_session"
process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"




import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import cookieParser from "cookie-parser"
import { AppModule } from "../src/app.module"

/**
 * E2E de autenticação:
 * - usa Supertest agent para guardar cookies
 * - prova que /auth/login seta cookie e /auth/me passa depois
 */
describe("Auth (e2e)", () => {
  let app: INestApplication

  beforeAll(async () => {
    /**
     * IMPORTANTE:
     * ConfigModule lê as variáveis ANTES / DURANTE o bootstrap do AppModule.
     * Então setamos process.env antes do Test.createTestingModule(...).compile().
     */

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    /**
     * No e2e o main.ts NÃO roda.
     * Então precisamos aplicar cookie-parser aqui também,
     * senão req.signedCookies não vai existir.
     */
    app.use(cookieParser(process.env.DOCKSENTINEL_SECRET))

    await app.init()
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
