import type { INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { configureApplication } from "../src/bootstrap/configure-app"
import { AppModule } from "../src/app.module"

export async function createTestApp(): Promise<{
  app: INestApplication
  moduleFixture: TestingModule
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication()
  await configureApplication(app)
  await app.init()

  return { app, moduleFixture }
}
