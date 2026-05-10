process.env.DOCKSENTINEL_SECRET = "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./create-test-app";



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
    const created = await createTestApp()
    app = created.app
  });

afterAll(async () => {
  if (app) await app.close()
})


  it("GET / should return 200", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);

  });
});
