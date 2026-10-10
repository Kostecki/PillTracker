import type { AppData, Dose, Settings, StockEvent } from "~/lib/types";

import { type Database, transaction } from "./db";

/** Bad input from a caller. Shown to them as is; retrying won't help. */
export class InvalidInput extends Error {}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STOCK_TYPES = ["refill", "count"] as const;
const SETTING_KEYS = ["startDay"] as const satisfies (keyof Settings)[];

export function readAll(db: Database): AppData {
	const doses = db
		.prepare("SELECT id, taken_at AS takenAt, day FROM doses ORDER BY taken_at")
		.all() as Dose[];
	const stock = db
		.prepare(
			"SELECT id, at, type, amount, change, price FROM stock ORDER BY at",
		)
		.all() as StockEvent[];
	const settings = Object.fromEntries(
		(
			db.prepare("SELECT key, value FROM settings").all() as {
				key: string;
				value: string;
			}[]
		).map(({ key, value }) => [key, value]),
	);
	// Rows come back as null-prototype objects; make them plain for callers
	return {
		doses: doses.map((d) => ({ ...d })),
		stock: stock.map((s) => ({ ...s })),
		settings,
	};
}

export type LogDoseInput = {
	id?: string;
	/** When it was taken. Defaults to now. */
	takenAt?: string;
	/** The local day it counts for. Defaults to the day of takenAt, see dayOf. */
	day?: string;
};

/**
 * Logs a dose, at most one per day: a second log for the same day (a retry,
 * the reminder button after the NFC sticker) is ignored.
 */
export function logDose(db: Database, input: LogDoseInput) {
	const takenAt = parseTime(
		input.takenAt ?? new Date().toISOString(),
		"takenAt",
	);
	const day = input.day ?? dayOf(input.takenAt ?? takenAt);
	if (!DAY.test(day)) throw new InvalidInput(`invalid day: "${day}"`);

	const { changes } = db
		.prepare("INSERT OR IGNORE INTO doses (id, taken_at, day) VALUES (?, ?, ?)")
		.run(input.id ?? crypto.randomUUID(), takenAt, day);
	// The dose that counts for the day: the new one, or the one already there
	const dose = {
		...(db
			.prepare("SELECT id, taken_at AS takenAt, day FROM doses WHERE day = ?")
			.get(day) as Dose),
	};
	return { logged: changes > 0, dose };
}

/** Changes when a dose was taken. Its day stays the same. */
export function updateDoseTime(db: Database, id: string, takenAt: string) {
	const { changes } = db
		.prepare("UPDATE doses SET taken_at = ? WHERE id = ?")
		.run(parseTime(takenAt, "takenAt"), id);
	if (changes === 0) throw new InvalidInput(`not found: ${id}`);
}

export function deleteDose(db: Database, id: string) {
	db.prepare("DELETE FROM doses WHERE id = ?").run(id);
}

export function addStock(db: Database, event: StockEvent) {
	const valid = validStock(event);
	db.prepare(
		"INSERT OR IGNORE INTO stock (id, at, type, amount, change, price) VALUES (?, ?, ?, ?, ?, ?)",
	).run(
		valid.id,
		valid.at,
		valid.type,
		valid.amount,
		valid.change,
		valid.price,
	);
}

export function updateStock(db: Database, event: StockEvent) {
	const valid = validStock(event);
	const { changes } = db
		.prepare(
			"UPDATE stock SET at = ?, amount = ?, change = ?, price = ? WHERE id = ?",
		)
		.run(valid.at, valid.amount, valid.change, valid.price, valid.id);
	if (changes === 0) throw new InvalidInput(`not found: ${event.id}`);
}

export function deleteStock(db: Database, id: string) {
	db.prepare("DELETE FROM stock WHERE id = ?").run(id);
}

/** An empty value removes the setting. */
export function setSetting(db: Database, key: keyof Settings, value: string) {
	if (!SETTING_KEYS.includes(key)) {
		throw new InvalidInput(`unknown setting: ${key}`);
	}
	if (value && key === "startDay" && !DAY.test(value)) {
		throw new InvalidInput(`invalid startDay: "${value}"`);
	}
	if (value) {
		db.prepare(
			"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
		).run(key, value);
	} else {
		db.prepare("DELETE FROM settings WHERE key = ?").run(key);
	}
}

/**
 * Imports everything from another source, e.g. the old Google Sheet. Rows
 * with an existing id are replaced, so running it twice is harmless.
 */
export function importData(db: Database, data: Partial<AppData>) {
	return transaction(db, () => {
		for (const dose of data.doses ?? []) {
			db.prepare(
				"INSERT OR REPLACE INTO doses (id, taken_at, day) VALUES (?, ?, ?)",
			).run(dose.id, parseTime(dose.takenAt, "takenAt"), dose.day);
		}
		for (const event of data.stock ?? []) {
			const valid = validStock({ ...event, price: event.price ?? null });
			db.prepare(
				"INSERT OR REPLACE INTO stock (id, at, type, amount, change, price) VALUES (?, ?, ?, ?, ?, ?)",
			).run(
				valid.id,
				valid.at,
				valid.type,
				valid.amount,
				valid.change,
				valid.price,
			);
		}
		for (const [key, value] of Object.entries(data.settings ?? {})) {
			setSetting(db, key as keyof Settings, value ?? "");
		}
		return {
			doses: data.doses?.length ?? 0,
			stock: data.stock?.length ?? 0,
			settings: Object.keys(data.settings ?? {}).length,
		};
	});
}

/**
 * The local day of a time. A time written with its UTC offset, like the
 * NFC shortcut sends ("2026-10-10T21:03:00+02:00"), says which day it was
 * where it was taken. Anything else falls back to the server's time zone.
 */
export function dayOf(time: string) {
	const withOffset = /^(\d{4}-\d{2}-\d{2})T[^Z]*[+-]\d{2}:?\d{2}$/.exec(time);
	if (withOffset) return withOffset[1];
	// sv-SE formats dates as YYYY-MM-DD
	return new Intl.DateTimeFormat("sv-SE").format(new Date(time));
}

/**
 * ISO 8601 with a time zone: "2026-10-10T08:00:00Z" or "…+02:00". Anything
 * looser is rejected, since Date happily reads "kl. 8" as 1 August 2001.
 */
const ISO_TIME =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

function parseTime(value: unknown, field: string) {
	const time =
		typeof value === "string" && ISO_TIME.test(value)
			? new Date(value)
			: undefined;
	if (!time || Number.isNaN(time.getTime())) {
		throw new InvalidInput(
			`${field} is missing or not a time: "${value ?? ""}"`,
		);
	}
	return time.toISOString();
}

function validStock(event: StockEvent): StockEvent {
	const { type, amount, change, price } = event;
	if (!event.id) throw new InvalidInput("stock entry needs an id");
	if (!STOCK_TYPES.includes(type))
		throw new InvalidInput(`invalid type: ${type}`);
	if (!Number.isInteger(amount) || amount < 0) {
		throw new InvalidInput(`invalid amount: ${amount}`);
	}
	if (!Number.isInteger(change))
		throw new InvalidInput(`invalid change: ${change}`);
	if (price != null && !(Number.isFinite(price) && price >= 0)) {
		throw new InvalidInput(`invalid price: ${price}`);
	}
	return {
		id: event.id,
		at: parseTime(event.at, "at"),
		type,
		amount,
		change,
		price: type === "refill" ? (price ?? null) : null,
	};
}
