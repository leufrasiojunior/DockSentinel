type AuthMode = "none" | "password" | "totp" | "both";

type Scenario = {
  mode: AuthMode;
  hint: string;
  expectedBody: Record<string, string>;
  needsPassword: boolean;
  needsTotp: boolean;
};

const scenarios: Scenario[] = [
  {
    mode: "none",
    hint: "Sem login: clique em Entrar.",
    expectedBody: {},
    needsPassword: false,
    needsTotp: false,
  },
  {
    mode: "password",
    hint: "Informe a senha.",
    expectedBody: { password: "StrongPass123!" },
    needsPassword: true,
    needsTotp: false,
  },
  {
    mode: "totp",
    hint: "Informe o código TOTP (6 dígitos).",
    expectedBody: { totp: "123456" },
    needsPassword: false,
    needsTotp: true,
  },
  {
    mode: "both",
    hint: "Informe senha + TOTP.",
    expectedBody: { password: "StrongPass123!", totp: "123456" },
    needsPassword: true,
    needsTotp: true,
  },
];

function setupCommonInterceptors(mode: AuthMode) {
  cy.intercept("GET", "**/auth/status", { statusCode: 200, body: { authMode: mode } }).as(
    "authStatus",
  );
  cy.intercept("GET", "**/auth/me", { statusCode: 200, body: { authenticated: true } }).as(
    "authMe",
  );
  cy.intercept("GET", "**/docker/containers*", { statusCode: 200, body: [] }).as(
    "dockerContainers",
  );
}

function parseRequestBody(body: unknown) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }
  return {};
}

function fillCredentials(mode: AuthMode) {
  if (mode === "password" || mode === "both") {
    cy.get('input[placeholder="Sua senha"]').type("StrongPass123!");
  }
  if (mode === "totp" || mode === "both") {
    cy.get('input[placeholder="123456"]').type("123456");
  }
}

function assertModeUi(mode: AuthMode, hint: string) {
  cy.contains(hint).should("be.visible");

  if (mode === "password" || mode === "both") {
    cy.get('input[placeholder="Sua senha"]').should("be.visible");
  } else {
    cy.get('input[placeholder="Sua senha"]').should("not.exist");
  }

  if (mode === "totp" || mode === "both") {
    cy.get('input[placeholder="123456"]').should("be.visible");
  } else {
    cy.get('input[placeholder="123456"]').should("not.exist");
  }
}

describe("Login - modos de autenticação aceitos", () => {
  scenarios.forEach((scenario) => {
    it(`renderiza campos corretos para authMode=${scenario.mode}`, () => {
      setupCommonInterceptors(scenario.mode);
      cy.visit("/login");
      assertModeUi(scenario.mode, scenario.hint);
    });

    it(`envia payload correto e navega para dashboard em authMode=${scenario.mode}`, () => {
      setupCommonInterceptors(scenario.mode);
      cy.intercept("POST", "**/auth/login", (req) => {
        const actualBody = parseRequestBody(req.body);
        expect(actualBody).to.deep.equal(scenario.expectedBody);
        req.reply({ statusCode: 200, body: { ok: true } });
      }).as("authLogin");

      cy.visit("/login");

      fillCredentials(scenario.mode);
      cy.contains("button", "Entrar").click();

      cy.wait("@authLogin");
      cy.location("pathname").should("eq", "/dashboard");
    });

    it(`exibe erro quando backend rejeita login em authMode=${scenario.mode}`, () => {
      const errorMessage = `Credenciais inválidas (${scenario.mode})`;

      setupCommonInterceptors(scenario.mode);
      cy.intercept("POST", "**/auth/login", {
        statusCode: 401,
        body: { message: errorMessage },
      }).as("authLoginFailed");

      cy.visit("/login");

      fillCredentials(scenario.mode);
      cy.contains("button", "Entrar").click();

      cy.wait("@authLoginFailed");
      cy.contains(errorMessage).should("be.visible");
      cy.location("pathname").should("eq", "/login");
    });
  });
});

describe("Login - cenários adicionais", () => {
  it("atualiza UI quando o backend troca authMode de password para both", () => {
    cy.intercept(
      { method: "GET", url: "**/auth/status", times: 1 },
      { statusCode: 200, body: { authMode: "password" } },
    ).as("statusPassword");

    cy.intercept("GET", "**/auth/status", {
      statusCode: 200,
      body: { authMode: "both" },
    }).as("statusBoth");

    cy.visit("/login");
    cy.wait("@statusPassword");
    assertModeUi("password", "Informe a senha.");

    cy.reload();
    cy.wait("@statusBoth");
    assertModeUi("both", "Informe senha + TOTP.");
  });

  it("atualiza UI quando o backend troca authMode de totp para password", () => {
    cy.intercept(
      { method: "GET", url: "**/auth/status", times: 1 },
      { statusCode: 200, body: { authMode: "totp" } },
    ).as("statusTotp");

    cy.intercept("GET", "**/auth/status", {
      statusCode: 200,
      body: { authMode: "password" },
    }).as("statusPassword");

    cy.visit("/login");
    cy.wait("@statusTotp");
    assertModeUi("totp", "Informe o código TOTP (6 dígitos).");

    cy.reload();
    cy.wait("@statusPassword");
    assertModeUi("password", "Informe a senha.");
  });

  it("redireciona para /settings ao clicar no botão Configurar", () => {
    setupCommonInterceptors("password");
    cy.intercept("GET", "**/settings", {
      statusCode: 200,
      body: {
        authMode: "password",
        logLevel: "info",
        hasPassword: true,
        hasTotp: false,
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-01T10:00:00.000Z",
      },
    }).as("safeSettings");
    cy.visit("/login");

    cy.contains("button", "Configurar").click();
    cy.wait("@safeSettings");
    cy.location("pathname").should("eq", "/settings");
  });

  it("respeita a rota de origem (location.state.from) após login", () => {
    setupCommonInterceptors("password");
    cy.intercept("POST", "**/auth/login", { statusCode: 200, body: { ok: true } }).as(
      "authLogin",
    );
    cy.intercept("GET", "**/settings", {
      statusCode: 200,
      body: {
        authMode: "password",
        logLevel: "info",
        hasPassword: true,
        hasTotp: false,
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-01T10:00:00.000Z",
      },
    }).as("safeSettings");

    cy.visit("/login", {
      onBeforeLoad(win) {
        win.history.replaceState({ usr: { from: "/settings" } }, "", "/login");
      },
    });

    cy.get('input[placeholder="Sua senha"]').type("StrongPass123!");
    cy.contains("button", "Entrar").click();

    cy.wait("@authLogin");
    cy.wait("@safeSettings");
    cy.location("pathname").should("eq", "/settings");
  });

  it("mostra erro de /auth/status e ainda permite tentativa de login", () => {
    cy.intercept("GET", "**/auth/status", {
      statusCode: 503,
      body: { message: "status indisponível" },
    }).as("statusError");

    cy.intercept("POST", "**/auth/login", (req) => {
      const actualBody = parseRequestBody(req.body);
      expect(actualBody).to.deep.equal({ password: "FallbackPass123" });
      req.reply({ statusCode: 401, body: { message: "Falha no login" } });
    }).as("authLoginFallback");

    cy.visit("/login");
    cy.wait("@statusError");

    cy.contains("Falha ao carregar").should("be.visible");
    cy.get('input[placeholder="Sua senha"]').type("FallbackPass123");
    cy.contains("button", "Entrar").click();

    cy.wait("@authLoginFallback");
    cy.contains("Falha no login").should("be.visible");
  });
});
