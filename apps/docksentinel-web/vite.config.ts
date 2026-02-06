import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
