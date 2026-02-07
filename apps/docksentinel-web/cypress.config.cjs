const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "firefox") {
          // Reduz problemas de isolamento/processos no runner do Cypress com Firefox.
          launchOptions.preferences["fission.autostart"] = false;
          launchOptions.preferences["network.proxy.allow_hijacking_localhost"] = true;
        }
        return launchOptions;
      });
    },
  },
  video: false,
});
