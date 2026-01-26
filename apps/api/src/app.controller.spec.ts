import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

/**
 * Unit Test:
 * - Testa uma unidade (controller/service) isoladamente.
 * - O Nest cria um "TestingModule" com DI igual ao app real.
 *
 * Docs oficiais de testing:
 * https://docs.nestjs.com/fundamentals/testing :contentReference[oaicite:5]{index=5}
 */
describe("AppController (unit)", () => {
  let appController: AppController;

  beforeEach(async () => {
    /**
     * Cria um módulo de teste (DI container).
     * Aqui você define quais controllers/providers quer incluir.
     */
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    /**
     * Pega uma instância real do controller (com dependências injetadas).
     */
    appController = moduleRef.get<AppController>(AppController);
  });

  it("should return 'Hello World!'", () => {
    /**
     * Testa o método do controller.
     * Esse é o esqueleto padrão que vamos substituir por testes reais dos módulos.
     */
    expect(appController.getHello()).toBe("Hello World!");
  });
});
