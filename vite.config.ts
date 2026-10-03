import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { sk } from "./src/i18n/sk";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
export default defineConfig(({ command, mode }) => {
  const creator = resolve("local/CreatorApp.tsx");
  if (mode === "editor" && !existsSync(creator))
    throw Error("Lokálny editor nie je súčasťou verejného repozitára.");
  const localEditor =
    existsSync(creator) &&
    ((command === "serve" && mode !== "player") || mode === "editor");
  return {
    resolve: {
      alias: { "@application": localEditor ? creator : resolve("src/App.tsx") },
    },
    build: { outDir: mode === "editor" ? "dist-editor" : "dist" },
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
          globPatterns: ["**/*.{js,css,html,png,svg,woff2,wav}"],
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname === "/game.story",
              handler: "NetworkFirst",
              options: {
                cacheName: "published-game",
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
  };
});
