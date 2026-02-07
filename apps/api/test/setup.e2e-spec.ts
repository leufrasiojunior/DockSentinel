import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Setup route removal (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // ✅ importante: cookie-parser com o MESMO secret do app
    app.use(cookieParser(process.env.DOCKSENTINEL_SECRET));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 404 for POST /setup', async () => {
    const res = await request(app.getHttpServer()).post('/setup').send({
      authMode: 'password',
      adminPassword: 'MyStrongPass123',
    });

    expect(res.status).toBe(404);
  });
});
