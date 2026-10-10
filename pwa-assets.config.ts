import {
	defineConfig,
	minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Icon background, the same blue as public/icon.svg
const background = "#228be6";

export default defineConfig({
	headLinkOptions: { preset: "2023" },
	preset: {
		...minimal2023Preset,
		// Full bleed: iOS rounds the corners itself, and the default white
		// padding showed up as a white border on the home screen
		apple: {
			...minimal2023Preset.apple,
			padding: 0,
			resizeOptions: { background },
		},
		// Keeps its padding as the safe zone for Android's masks, on blue
		// instead of white
		maskable: {
			...minimal2023Preset.maskable,
			resizeOptions: { background },
		},
	},
	images: ["public/icon.svg"],
});
