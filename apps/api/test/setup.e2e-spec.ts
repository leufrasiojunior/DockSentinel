import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('Setup route removal (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const created = await createTestApp();
    app = created.app;
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
