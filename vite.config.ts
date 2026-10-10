import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
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
		tanstackStart({
			srcDirectory: "src",
			// A single-user app behind a login gains nothing from server
			// rendering, and an SPA shell is simplest to cache offline
			spa: { enabled: true },
		}),
		nitro(),
		viteReact(),
		VitePWA({
			registerType: "autoUpdate",
			// Where Start puts the files the server serves
			outDir: ".output/public",
			// Registered from the root route; there's no index.html to inject into
			injectRegister: false,
			manifest: {
				name: "Pill Tracker",
				short_name: "Piller",
				description: "Har jeg taget min pille i dag?",
				lang: "da",
				theme_color: "#228be6",
				background_color: "#ffffff",
				display: "standalone",
				start_url: "/",
				// Generated into public/ by `pnpm generate-pwa-assets` (see
				// pwa-assets.config.ts); rerun it when public/icon.svg changes
				icons: [
					{ src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
					{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
				navigateFallback: "/_shell.html",
				// The SPA shell is written after the service worker is generated,
				// so it's added by hand; the build time makes each build refresh it
				additionalManifestEntries: [
					{ url: "/_shell.html", revision: String(Date.now()) },
				],
				// The server's own endpoints must always go to the network
				navigateFallbackDenylist: [/^\/api\//, /^\/_serverFn\//],
			},
		}),
	],
});
