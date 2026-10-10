import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't load the router and PWA plugins
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ["src/**/*.test.ts"],
		// Fixed, so date logic tests don't depend on the machine's time zone
		env: { TZ: "Europe/Copenhagen" },
	},
});
