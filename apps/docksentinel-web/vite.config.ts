import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

const API_TARGET = "http://localhost:3000";
const rootPackageJsonPath = path.resolve(__dirname, "../../package.json");
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf-8")) as { version?: string };
const appVersion = rootPackageJson.version ?? "0.0.0";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
  server: {
    proxy: {
      // AUTH
      "^/auth/.*": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },

      // DOCKER
      "^/docker/.*": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },

      // UPDATES
      "^/updates/.*": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },

      // NOTIFICATIONS API (avoid clash with SPA route /notifications)
      "/api/notifications": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // SETTINGS/SETUP/HEALTH
      "/settings": { 
        target: API_TARGET, 
        changeOrigin: true, 
        secure: false 
      },

      "^/setup$": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "^/health$": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/settings/totp": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },

});
