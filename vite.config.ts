import { execSync } from "node:child_process";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * The commit this build is from: COMMIT_SHA in CI (the Docker build has no
 * .git), otherwise asked from git, otherwise "dev".
 */
function commitSha() {
	if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
	try {
		return execSync("git rev-parse HEAD", {
			stdio: ["ignore", "pipe", "ignore"],
		})
			.toString()
			.trim();
	} catch {
		return "dev";
	}
}

export default defineConfig({
	// Shown in the settings dialog, to tell which version is running
	define: {
		__COMMIT_SHA__: JSON.stringify(commitSha()),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
	},
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
		nitro({
			// Caches in front of the server (the browser, Cloudflare, Pangolin)
			// must always revalidate files whose name stays the same between
			// builds; a cached sw.js kept serving an old, broken one. Hashed
			// assets change name when they change, so they can be kept forever.
			routeRules: {
				"/sw.js": { headers: { "cache-control": "no-cache" } },
				"/manifest.webmanifest": { headers: { "cache-control": "no-cache" } },
				"/assets/**": {
					headers: { "cache-control": "public, max-age=31536000, immutable" },
				},
				"/**": { headers: { "cache-control": "no-cache" } },
			},
		}),
		viteReact(),
		// Start builds the client, the server and Nitro as separate Vite
		// environments. The part that writes sw.js belongs to the client only:
		// running it again later rewrote sw.js after Nitro had recorded its
		// size, so the server cut the file short. The rest (virtual:pwa-register)
		// is needed everywhere the root route is bundled.
		...VitePWA({
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
				// Every page is the same shell (no server rendering, see
				// src/start.ts), so "/" serves as the offline page for all of them.
				// The server renders it, so it's added by hand; the build time
				// makes each build refresh it.
				navigateFallback: "/",
				additionalManifestEntries: [{ url: "/", revision: String(Date.now()) }],
				// The server's own endpoints must always go to the network
				navigateFallbackDenylist: [/^\/api\//, /^\/_serverFn\//],
			},
		}).map((plugin) =>
			plugin.name === "vite-plugin-pwa:build"
				? {
						...plugin,
						applyToEnvironment: (environment: { name: string }) =>
							environment.name === "client",
					}
				: plugin,
		),
	],
});
