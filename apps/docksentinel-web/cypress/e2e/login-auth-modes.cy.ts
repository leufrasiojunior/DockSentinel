type AuthMode = "none" | "password" | "totp" | "both";

type Scenario = {
  mode: AuthMode;
  hint: string;
  expectedBody: Record<string, string>;
};

const scenarios: Scenario[] = [
  {
    mode: "none",
    hint: "Sem login: clique em Entrar.",
    expectedBody: {},
  },
  {
    mode: "password",
    hint: "Informe a senha.",
    expectedBody: { password: "StrongPass123!" },
  },
  {
    mode: "totp",
    hint: "Informe o código TOTP (6 dígitos).",
    expectedBody: { totp: "123456" },
  },
  {
    mode: "both",
    hint: "Informe senha + TOTP.",
    expectedBody: { password: "StrongPass123!", totp: "123456" },
  },
];

const safeSettingsResponse = {
  authMode: "password",
  logLevel: "info",
  hasPassword: true,
  hasTotp: false,
  defaultLocale: "pt-BR",
  notificationsInAppEnabled: true,
  notificationsEmailEnabled: false,
  notificationLevel: "all",
  notificationReadRetentionDays: 15,
  notificationUnreadRetentionDays: 60,
  environmentHealthcheckIntervalMin: 5,
  notificationRecipientEmail: null,
  smtpHost: null,
  smtpPort: null,
  smtpSecureMode: "starttls",
  smtpUsername: null,
  hasSmtpPassword: false,
  smtpFromName: null,
  smtpFromEmail: null,
  createdAt: "2026-02-01T10:00:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z",
};

function setupCommonInterceptors(mode: AuthMode) {
  cy.intercept("GET", "**/api/auth/status", { statusCode: 200, body: { authMode: mode } }).as(
    "authStatus",
  );
  cy.intercept("GET", "**/api/auth/me", { statusCode: 200, body: { authenticated: true } }).as(
    "authMe",
  );
  cy.intercept("GET", "**/api/environments/overview", {
    statusCode: 200,
    body: { items: [] },
  }).as("overview");
}

function setupSettingsPageInterceptors(pathname: string) {
  cy.intercept("GET", "**/api/auth/status", { statusCode: 200, body: { authMode: "none" } }).as(
    "authStatus",
  );
  cy.intercept("GET", "**/api/settings", { statusCode: 200, body: safeSettingsResponse }).as(
    "safeSettings",
  );

  if (pathname.startsWith("/settings/environments")) {
    cy.intercept("GET", "**/api/environments", {
      statusCode: 200,
      body: {
        items: [
          {
            id: "local",
            kind: "local",
            name: "Local",
            baseUrl: null,
            hasToken: false,
            rotationState: "paired",
            agentVersion: null,
            dockerVersion: null,
            lastSeenAt: null,
            lastError: null,
            status: "online",
            createdAt: "2026-02-01T10:00:00.000Z",
            updatedAt: "2026-02-01T10:00:00.000Z",
          },
        ],
      },
    }).as("listEnvironments");
  }
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

    it(`envia payload correto e navega para home em authMode=${scenario.mode}`, () => {
      setupCommonInterceptors(scenario.mode);
      cy.intercept("POST", "**/api/auth/login", (req) => {
        const actualBody = parseRequestBody(req.body);
        expect(actualBody).to.deep.equal(scenario.expectedBody);
        req.reply({ statusCode: 200, body: { ok: true } });
      }).as("authLogin");

      cy.visit("/login");

      fillCredentials(scenario.mode);
      cy.contains("button", "Entrar").click();

      cy.wait("@authLogin");
      cy.wait("@overview");
      cy.location("pathname").should("eq", "/home");
    });

    it(`exibe erro quando backend rejeita login em authMode=${scenario.mode}`, () => {
      const errorMessage = `Credenciais inválidas (${scenario.mode})`;

      setupCommonInterceptors(scenario.mode);
      cy.intercept("POST", "**/api/auth/login", {
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
      { method: "GET", url: "**/api/auth/status", times: 1 },
      { statusCode: 200, body: { authMode: "password" } },
    ).as("statusPassword");

    cy.intercept("GET", "**/api/auth/status", {
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
      { method: "GET", url: "**/api/auth/status", times: 1 },
      { statusCode: 200, body: { authMode: "totp" } },
    ).as("statusTotp");

    cy.intercept("GET", "**/api/auth/status", {
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

  it("respeita a rota de origem (location.state.from) após login", () => {
    setupCommonInterceptors("password");
    cy.intercept("POST", "**/api/auth/login", { statusCode: 200, body: { ok: true } }).as(
      "authLogin",
    );
    cy.intercept("GET", "**/api/settings", { statusCode: 200, body: safeSettingsResponse }).as(
      "safeSettings",
    );

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
    cy.intercept("GET", "**/api/auth/status", {
      statusCode: 503,
      body: { message: "status indisponível" },
    }).as("statusError");

    cy.intercept("POST", "**/api/auth/login", (req) => {
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

describe("Settings - navegação direta", () => {
  it("carrega a SPA ao abrir /settings diretamente", () => {
    setupSettingsPageInterceptors("/settings");

    cy.visit("/settings");

    cy.wait("@authStatus");
    cy.wait("@safeSettings");
    cy.location("pathname").should("eq", "/settings");
    cy.contains("button", "Autenticação").should("have.attr", "data-state", "active");
  });

  it("carrega a SPA ao abrir /settings/notifications diretamente", () => {
    setupSettingsPageInterceptors("/settings/notifications");

    cy.visit("/settings/notifications");

    cy.wait("@authStatus");
    cy.wait("@safeSettings");
    cy.location("pathname").should("eq", "/settings/notifications");
    cy.contains("button", "Notificações").should("have.attr", "data-state", "active");
    cy.contains("SMTP").should("be.visible");
  });

  it("carrega a SPA ao abrir /settings/environments diretamente", () => {
    setupSettingsPageInterceptors("/settings/environments");

    cy.visit("/settings/environments");

    cy.wait("@authStatus");
    cy.wait("@safeSettings");
    cy.wait("@listEnvironments");
    cy.location("pathname").should("eq", "/settings/environments");
    cy.contains("button", "Environments").should("have.attr", "data-state", "active");
    cy.contains("Local").should("be.visible");
  });
});
