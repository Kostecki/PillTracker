export type Config = {
	scriptUrl: string;
	token: string;
};

const STORAGE_KEY = "pill-tracker:config";

function isConfig(value: unknown): value is Config {
	if (typeof value !== "object" || value === null) return false;
	const { scriptUrl, token } = value as Record<string, unknown>;
	return (
		typeof scriptUrl === "string" &&
		scriptUrl.length > 0 &&
		typeof token === "string" &&
		token.length > 0
	);
}

/**
 * config.json is written by the container at startup so the image itself
 * carries no secrets. The last good copy is kept in localStorage so the app
 * still starts offline, or when Pangolin answers with its login page instead.
 */
export async function loadConfig(): Promise<Config | null> {
	try {
		const res = await fetch("/config.json", { cache: "no-store" });
		if (res.ok) {
			const data: unknown = await res.json();
			if (isConfig(data)) {
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
				} catch {}
				return data;
			}
		}
	} catch {}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const data: unknown = JSON.parse(stored);
			if (isConfig(data)) return data;
		}
	} catch {}

	return null;
}
