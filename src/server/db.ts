import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Schema changes, in order. A database records how many it has applied in
 * `user_version`, so new ones run once on startup. Never edit a migration
 * that has shipped; add a new one.
 */
const MIGRATIONS = [
	`
	CREATE TABLE doses (
		id TEXT PRIMARY KEY,
		taken_at TEXT NOT NULL,
		-- Local date on the phone when it was logged; one dose per day
		day TEXT NOT NULL UNIQUE
	);
	CREATE TABLE stock (
		id TEXT PRIMARY KEY,
		at TEXT NOT NULL,
		type TEXT NOT NULL CHECK (type IN ('refill', 'count')),
		amount INTEGER NOT NULL CHECK (amount >= 0),
		-- How much this entry moved the stock; pills left = sum(change) - doses
		change INTEGER NOT NULL,
		-- What a box cost in kr, refills only
		price REAL CHECK (price IS NULL OR price >= 0)
	);
	CREATE TABLE settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`,
];

export type Database = DatabaseSync;

export function openDatabase(path: string): Database {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec("PRAGMA journal_mode = WAL");

	const { user_version: applied } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	for (let i = applied; i < MIGRATIONS.length; i++) {
		transaction(db, () => {
			db.exec(MIGRATIONS[i]);
			db.exec(`PRAGMA user_version = ${i + 1}`);
		});
	}
	return db;
}

export function transaction<T>(db: Database, fn: () => T): T {
	db.exec("BEGIN");
	try {
		const result = fn();
		db.exec("COMMIT");
		return result;
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}

let shared: Database | undefined;

/** The app's database, at DATABASE_PATH. */
export function getDatabase() {
	shared ??= openDatabase(
		process.env.DATABASE_PATH ?? "data/pill-tracker.sqlite",
	);
	return shared;
}
