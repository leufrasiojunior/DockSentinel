import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

const rootPackageJsonPath = path.resolve(__dirname, "../../package.json");
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf-8")) as { version?: string };
const appVersion = rootPackageJson.version ?? "0.0.0";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget = (env.API_PROXY_TARGET || env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

  return {
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
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },

        // DOCKER
        "^/docker/.*": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },

        // UPDATES
        "^/updates/.*": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },

        // NOTIFICATIONS API (avoid clash with SPA route /notifications)
        "/api/notifications": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },

        "/api/environments": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },

        // SETTINGS/SETUP/HEALTH
        "/settings": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },

        "^/setup$": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "^/health$": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/settings/totp": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
