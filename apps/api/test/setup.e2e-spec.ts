import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Setup (e2e)', () => {
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

  it('should allow /setup the first time (public) and then block it', async () => {
    // 1) roda setup (primeira vez deve funcionar)
    const res = await request(app.getHttpServer()).post('/setup').send({
      authMode: 'password',
      adminPassword: 'MyStrongPass123',
    });

    expect([200, 201]).toContain(res.status);

    // 2) segunda vez deve bloquear (setup já feito)
    const res2 = await request(app.getHttpServer()).post('/setup').send({
      authMode: 'password',
      adminPassword: 'MyStrongPass123',
    });

    // seu service disse que retorna 409 após setup concluído
    expect(res2.status).toBe(409);
  });

  it('should require auth for /settings after switching authMode to password', async () => {
    // ✅ Sem cookie deve negar (porque authMode=password no DB após setup)
    const noCookie = await request(app.getHttpServer()).get('/settings');
    expect([401, 403]).toContain(noCookie.status);

    // ✅ Faz login e usa agent pra manter cookie
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent.post('/auth/login').send({
      password: 'MyStrongPass123',
    });

    expect([200, 201]).toContain(loginRes.status);

    // ✅ Agora /settings deve funcionar com cookie
    await agent.get('/settings').expect(200);
  });

  it('should reject login with wrong password (no session cookie)', async () => {
    // Usamos agent porque ele guarda cookies automaticamente.
    // Aqui a ideia é garantir que, com senha errada:
    // - o status seja 401/403
    // - nenhum cookie ds_session seja setado
    const agent = request.agent(app.getHttpServer());

    const res = await agent.post('/auth/login').send({
      password: 'WrongPassword999',
    });

    // dependendo do seu AuthService/Guard, pode ser 401 ou 403
    expect([401, 403]).toContain(res.status);

    // garante que não setou cookie de sessão
    const raw = res.headers['set-cookie'] as string | string[] | undefined;

    const setCookieHeader = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const hasSessionCookie = (setCookieHeader ?? []).some((c) =>
      c.startsWith('ds_session='),
    );
    expect(hasSessionCookie).toBe(false);

    // e também garante que continua negando /settings sem login válido
    const settingsRes = await agent.get('/settings');
    expect([401, 403]).toContain(settingsRes.status);
  });
});
