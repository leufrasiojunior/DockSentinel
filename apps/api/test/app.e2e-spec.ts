process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"



import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import cookieParser from "cookie-parser";



/**
 * E2E Test:
 * - Sobe o app (quase como produção) e faz requests HTTP com Supertest.
 *
 * Docs oficiais de testing:
 * https://docs.nestjs.com/fundamentals/testing :contentReference[oaicite:6]{index=6}
 */
describe("App (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    /**
     * Cria o app Nest completo (AppModule) para testar endpoints reais.
     */
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser(process.env.DOCKSENTINEL_SECRET))


    // Inicializa o app (mas não precisa fazer listen numa porta real)
    await app.init();
  });

afterAll(async () => {
  if (app) await app.close()
})


  it("GET / should return 200", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);

  });
});
