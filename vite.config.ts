import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { sk } from "./src/i18n/sk";
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png", "icon.svg"],
      manifest: {
        name: sk.app.name,
        short_name: sk.app.name,
        description: sk.app.description,
        lang: "sk",
        start_url: "/play",
        scope: "/",
        display: "standalone",
        background_color: "#171b19",
        theme_color: "#171b19",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});
