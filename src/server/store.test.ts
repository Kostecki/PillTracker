import { beforeEach, describe, expect, it } from "vitest";

import type { StockEvent } from "~/lib/types";

import { type Database, openDatabase } from "./db";
import {
	addStock,
	dayOf,
	deleteDose,
	deleteStock,
	InvalidInput,
	importData,
	logDose,
	readAll,
	setSetting,
	updateDoseTime,
	updateStock,
} from "./store";

let db: Database;

beforeEach(() => {
	db = openDatabase(":memory:");
});

const box: StockEvent = {
	id: "box",
	at: "2026-10-10T10:00:00.000Z",
	type: "refill",
	amount: 100,
	change: 100,
	price: 37.35,
};

describe("doses", () => {
	it("logs one dose per day and ignores the rest", () => {
		const first = logDose(db, {
			id: "a",
			takenAt: "2026-10-10T08:00:00.000Z",
			day: "2026-10-10",
		});
		const second = logDose(db, {
			id: "b",
			takenAt: "2026-10-10T19:00:00.000Z",
			day: "2026-10-10",
		});

		expect(first.logged).toBe(true);
		expect(second.logged).toBe(false);
		// Answers with the dose that counts, not the ignored one
		expect(second.dose.id).toBe("a");
		expect(readAll(db).doses).toEqual([
			{ id: "a", takenAt: "2026-10-10T08:00:00.000Z", day: "2026-10-10" },
		]);
	});

	it("ignores a retry with the same id", () => {
		const dose = {
			id: "a",
			takenAt: "2026-10-10T08:00:00.000Z",
			day: "2026-10-10",
		};
		logDose(db, dose);
		expect(logDose(db, dose).logged).toBe(false);
		expect(readAll(db).doses).toHaveLength(1);
	});

	it("works out the day and id from a local time, like the NFC shortcut sends", () => {
		const { dose } = logDose(db, { takenAt: "2026-10-10T23:30:00+02:00" });
		expect(dose.day).toBe("2026-10-10");
		expect(dose.takenAt).toBe("2026-10-10T21:30:00.000Z");
		expect(dose.id).toMatch(/^[0-9a-f-]{36}$/);
	});

	it("defaults to now", () => {
		const { dose } = logDose(db, {});
		expect(Date.now() - new Date(dose.takenAt).getTime()).toBeLessThan(5000);
	});

	it("rejects a time that isn't one", () => {
		expect(() => logDose(db, { takenAt: "" })).toThrow(InvalidInput);
		expect(() => logDose(db, { takenAt: "kl. 8" })).toThrow(
			'takenAt is missing or not a time: "kl. 8"',
		);
		// A time without a time zone is ambiguous
		expect(() => logDose(db, { takenAt: "2026-10-10T08:00:00" })).toThrow(
			InvalidInput,
		);
		expect(() =>
			logDose(db, { takenAt: "2026-10-10T08:00:00Z", day: "10/10" }),
		).toThrow('invalid day: "10/10"');
	});

	it("edits only the time, never the day", () => {
		logDose(db, {
			id: "a",
			takenAt: "2026-10-10T19:00:00.000Z",
			day: "2026-10-10",
		});
		updateDoseTime(db, "a", "2026-10-10T06:15:00.000Z");
		expect(readAll(db).doses[0]).toEqual({
			id: "a",
			takenAt: "2026-10-10T06:15:00.000Z",
			day: "2026-10-10",
		});
		expect(() => updateDoseTime(db, "missing", "2026-10-10T06:15:00Z")).toThrow(
			"not found: missing",
		);
	});

	it("deletes", () => {
		logDose(db, {
			id: "a",
			takenAt: "2026-10-10T08:00:00Z",
			day: "2026-10-10",
		});
		deleteDose(db, "a");
		expect(readAll(db).doses).toEqual([]);
	});
});

describe("stock", () => {
	it("adds, edits and deletes entries", () => {
		addStock(db, box);
		addStock(db, box); // retry
		expect(readAll(db).stock).toEqual([box]);

		updateStock(db, { ...box, amount: 50, change: 50, price: null });
		expect(readAll(db).stock[0]).toMatchObject({ amount: 50, price: null });

		deleteStock(db, "box");
		expect(readAll(db).stock).toEqual([]);
	});

	it("never stores a price on a count", () => {
		addStock(db, { ...box, id: "count", type: "count", price: 12 });
		expect(readAll(db).stock[0].price).toBeNull();
	});

	it("rejects bad entries", () => {
		expect(() => addStock(db, { ...box, amount: 2.5 })).toThrow(
			"invalid amount",
		);
		expect(() => addStock(db, { ...box, price: -1 })).toThrow("invalid price");
		expect(() =>
			addStock(db, { ...box, type: "gift" as StockEvent["type"] }),
		).toThrow("invalid type");
		expect(() => updateStock(db, { ...box, id: "missing" })).toThrow(
			"not found",
		);
	});
});

describe("settings", () => {
	it("sets and clears the first day", () => {
		setSetting(db, "startDay", "2026-10-01");
		expect(readAll(db).settings).toEqual({ startDay: "2026-10-01" });
		setSetting(db, "startDay", "");
		expect(readAll(db).settings).toEqual({});
	});

	it("rejects unknown settings and bad days", () => {
		expect(() => setSetting(db, "theme" as "startDay", "dark")).toThrow(
			"unknown setting",
		);
		expect(() => setSetting(db, "startDay", "oktober")).toThrow(
			"invalid startDay",
		);
	});
});

describe("importData", () => {
	const sheet = {
		doses: [
			{ id: "d1", takenAt: "2026-10-10T10:31:00.000Z", day: "2026-10-10" },
		],
		stock: [box],
		settings: { startDay: "2026-10-10" },
	};

	it("imports what the old Google Sheet returned, and can run twice", () => {
		expect(importData(db, sheet)).toEqual({ doses: 1, stock: 1, settings: 1 });
		importData(db, sheet);
		expect(readAll(db)).toEqual(sheet);
	});

	it("imports nothing when one row is bad", () => {
		expect(() =>
			importData(db, { ...sheet, stock: [{ ...box, amount: -1 }] }),
		).toThrow(InvalidInput);
		expect(readAll(db)).toEqual({ doses: [], stock: [], settings: {} });
	});
});

describe("dayOf", () => {
	it("uses the day of a time written with its offset", () => {
		expect(dayOf("2026-10-10T23:30:00+02:00")).toBe("2026-10-10");
		expect(dayOf("2026-10-10T01:00:00-0700")).toBe("2026-10-10");
	});

	it("falls back to the server's time zone otherwise", () => {
		// The test run's time zone is Europe/Copenhagen, see vitest.config.ts
		expect(dayOf("2026-10-10T22:30:00.000Z")).toBe("2026-10-11");
	});
});
