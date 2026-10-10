import type { Config } from "./config";

export type Dose = {
	id: string;
	/** ISO 8601 timestamp (UTC) */
	takenAt: string;
	/**
	 * Local date on the phone when it was logged (YYYY-MM-DD). This decides
	 * which day the dose counts for, wherever you are later.
	 */
	day: string;
};

export type StockEvent = {
	id: string;
	/** ISO 8601 timestamp (UTC) */
	at: string;
	/** A refill is a new box of `amount` pills, a count is `amount` pills counted */
	type: "refill" | "count";
	amount: number;
	/**
	 * How much this entry moved the stock. Pills left = the sum of all changes
	 * minus the number of doses, so nothing depends on when things happened.
	 */
	change: number;
	/** What a box cost in kr. Optional, and only for refills. */
	price?: number | null;
};

export type Settings = {
	/** First day of tracking (YYYY-MM-DD). Earlier days don't count as missed. */
	startDay?: string;
};

export type SheetData = {
	doses: Dose[];
	stock: StockEvent[];
	settings: Settings;
};

let config: Config | null = null;

export function configureApi(value: Config) {
	config = value;
}

function getConfig(): Config {
	if (!config) throw new Error("API used before it was configured");
	return config;
}

/** An error the script answered with. Retrying won't change the answer. */
export class ScriptError extends Error {}

async function parse<T>(res: Response): Promise<T> {
	if (!res.ok) throw new Error(`Apps Script svarede med status ${res.status}`);
	const data = (await res.json()) as T & { error?: string };
	if (data.error?.startsWith("unknown action")) {
		throw new ScriptError(
			`Scriptet i arket er forældet (${data.error}). Udrul den nyeste version af apps-script/Code.js.`,
		);
	}
	if (data.error) throw new ScriptError(data.error);
	return data;
}

// No Content-Type header on purpose: the body is sent as text/plain, which
// keeps it a "simple" request. Apps Script can't answer a CORS preflight.
async function post(body: Record<string, unknown>) {
	const { scriptUrl, token } = getConfig();
	const res = await fetch(scriptUrl, {
		method: "POST",
		body: JSON.stringify({ token, ...body }),
	});
	await parse<{ ok: true }>(res);
}

export async function fetchSheet(): Promise<SheetData> {
	const { scriptUrl, token } = getConfig();
	const url = new URL(scriptUrl);
	url.searchParams.set("token", token);
	const {
		doses,
		stock = [],
		settings = {},
	} = await parse<SheetData>(await fetch(url));
	return { doses, stock, settings };
}

export function logDose(dose: Dose) {
	return post({ action: "log", ...dose });
}

export function updateDose(dose: Dose) {
	return post({ action: "updateDose", ...dose });
}

export function deleteDose(id: string) {
	return post({ action: "delete", id });
}

export function addStock(event: StockEvent) {
	return post({ action: "addStock", ...event });
}

export function updateStock(event: StockEvent) {
	return post({ action: "updateStock", ...event });
}

export function setSetting(key: keyof Settings, value: string) {
	return post({ action: "setSetting", key, value });
}

export function deleteStock(id: string) {
	return post({ action: "deleteStock", id });
}
