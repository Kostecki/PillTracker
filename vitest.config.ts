import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't load the router and PWA plugins
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
});
