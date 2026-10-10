import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	server: {
		port: 3000,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		viteReact(),
		VitePWA({
			registerType: "autoUpdate",
			// Pangolin's auth cookie has to be sent with the manifest request,
			// otherwise it gets redirected to the login page and install breaks.
			useCredentials: true,
			pwaAssets: { config: true },
			manifest: {
				name: "Pill Tracker",
				short_name: "Piller",
				description: "Har jeg taget min pille i dag?",
				lang: "da",
				theme_color: "#228be6",
				background_color: "#ffffff",
				display: "standalone",
				start_url: "/",
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
				navigateFallback: "/index.html",
				// config.json is written by the container at startup and must
				// never be served from the precache.
				globIgnores: ["**/config.json"],
			},
		}),
	],
});
