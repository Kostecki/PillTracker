import "dayjs/locale/da";

import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Dose, StockEvent } from "./api";
import {
	balance,
	changeFor,
	formatKr,
	lastBoxPrice,
	lastBoxSize,
	priceHistory,
	pricePerPill,
	stockColor,
	stockStatus,
	stockSummary,
	totalSpent,
} from "./stock";

dayjs.locale("da");

const TODAY = "2026-10-10";

beforeEach(() => {
	vi.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`) });
});

afterEach(() => {
	vi.useRealTimers();
});

/** A dose on a day relative to today (0 = today, 1 = yesterday, …). */
function dose(daysAgo: number): Dose {
	const day = dayjs(TODAY).subtract(daysAgo, "day").format("YYYY-MM-DD");
	return { id: `dose-${day}`, takenAt: `${day}T08:00:00.000Z`, day };
}

/**
 * Replays app actions the way the UI performs them, so tests read like the
 * sequences of taps that went wrong in real use.
 */
function app() {
	let doses: Dose[] = [];
	let stock: StockEvent[] = [];
	let next = 0;

	const addStock = (type: StockEvent["type"], amount: number) => {
		const event: StockEvent = {
			id: `stock-${next++}`,
			at: new Date().toISOString(),
			type,
			amount,
			change: changeFor(type, amount, doses, stock),
		};
		stock = [...stock, event];
		return event.id;
	};

	return {
		take(daysAgo = 0) {
			const d = { ...dose(daysAgo), id: `dose-${next++}` };
			doses = [...doses, d];
			return d.id;
		},
		deleteDose(id: string) {
			doses = doses.filter((d) => d.id !== id);
		},
		editDoseTime(id: string, takenAt: string) {
			doses = doses.map((d) => (d.id === id ? { ...d, takenAt } : d));
		},
		box: (amount: number) => addStock("refill", amount),
		count: (amount: number) => addStock("count", amount),
		editStock(id: string, amount: number) {
			stock = stock.map((e) =>
				e.id === id
					? { ...e, amount, change: e.change + (amount - e.amount) }
					: e,
			);
		},
		deleteStock(id: string) {
			stock = stock.filter((e) => e.id !== id);
		},
		left: () => balance(doses, stock),
		status: () => stockStatus(doses, stock),
		stock: () => stock,
	};
}

describe("pills left", () => {
	it("counts down from a box and back up when a dose is deleted", () => {
		const a = app();
		a.box(100);
		const d = a.take();
		expect(a.left()).toBe(99);

		a.deleteDose(d);
		expect(a.left()).toBe(100);
	});

	it("doesn't change when a dose's time is edited", () => {
		const a = app();
		a.box(100);
		const d = a.take();
		a.editDoseTime(d, `${TODAY}T05:00:00.000Z`);
		expect(a.left()).toBe(99);
	});

	it("ignores doses logged before the first box", () => {
		const a = app();
		a.take(2);
		a.take(1);
		a.box(100);
		expect(a.left()).toBe(100);

		a.take();
		expect(a.left()).toBe(99);
	});

	it("adds a new box to the pills already left", () => {
		const a = app();
		a.box(100);
		for (let i = 0; i < 93; i++) a.take();
		expect(a.left()).toBe(7);

		a.box(100);
		expect(a.left()).toBe(107);
	});

	it("sets the stock to a count, and edits or deletes it cleanly", () => {
		const a = app();
		a.box(100);
		for (let i = 0; i < 10; i++) a.take();
		const count = a.count(88);
		expect(a.left()).toBe(88);

		a.take();
		expect(a.left()).toBe(87);

		a.editStock(count, 89);
		expect(a.left()).toBe(88);

		// Back to what it would have been without the count
		a.deleteStock(count);
		expect(a.left()).toBe(89);
	});

	it("applies edits and deletions of boxes as their own change", () => {
		const a = app();
		const first = a.box(100);
		a.take();
		a.editStock(first, 30);
		expect(a.left()).toBe(29);

		const second = a.box(50);
		expect(a.left()).toBe(79);
		a.deleteStock(second);
		expect(a.left()).toBe(29);
	});
});

describe("stockStatus", () => {
	it("is null before any stock is entered", () => {
		const a = app();
		a.take();
		expect(a.status()).toBeNull();
	});

	it("counts today in the last day when today's pill is still to take", () => {
		const a = app();
		a.box(10);
		expect(a.status()?.lastDay.format("YYYY-MM-DD")).toBe("2026-10-19");

		a.take();
		expect(a.status()?.lastDay.format("YYYY-MM-DD")).toBe("2026-10-19");
		expect(a.status()?.remaining).toBe(9);
	});

	it("is low at 14 pills or fewer", () => {
		const a = app();
		a.box(15);
		expect(a.status()?.low).toBe(false);
		a.take();
		expect(a.status()?.low).toBe(true);
	});
});

describe("stockSummary and stockColor", () => {
	it("invites tracking before any stock", () => {
		expect(stockSummary(null)).toBe("Hold styr på beholdningen");
		expect(stockColor(null)).toBe("dimmed");
	});

	it("shows pills left and when they run out", () => {
		const a = app();
		a.box(43);
		a.take();
		expect(stockSummary(a.status())).toBe(
			"42 piller tilbage · rækker til 21. nov.",
		);
		expect(stockColor(a.status())).toBe("dimmed");
	});

	it("goes orange when low and red when empty", () => {
		const a = app();
		a.box(2);
		expect(stockColor(a.status())).toBe("orange");
		expect(stockSummary(a.status())).toBe(
			"2 piller tilbage · rækker til 11. okt.",
		);

		a.take(1);
		a.take();
		expect(stockSummary(a.status())).toBe("Ingen piller tilbage");
		expect(stockColor(a.status())).toBe("red");
	});

	it("uses the singular for one pill", () => {
		const a = app();
		a.box(1);
		expect(stockSummary(a.status())).toBe(
			"1 pille tilbage · rækker til 10. okt.",
		);
	});
});

describe("lastBoxSize", () => {
	it("defaults to 100 and then follows the last box", () => {
		const a = app();
		expect(lastBoxSize(a.stock())).toBe(100);
		a.box(30);
		a.count(12);
		expect(lastBoxSize(a.stock())).toBe(30);
	});
});

describe("prices", () => {
	const box = (amount: number, price: number | null): StockEvent => ({
		id: `box-${amount}-${price}`,
		at: `${TODAY}T10:00:00.000Z`,
		type: "refill",
		amount,
		change: amount,
		price,
	});
	const count: StockEvent = {
		id: "count",
		at: `${TODAY}T11:00:00.000Z`,
		type: "count",
		amount: 50,
		change: 0,
	};

	it("uses the last box with a price for the price per pill", () => {
		expect(pricePerPill([box(100, 245), box(50, null), count])).toBe(2.45);
		expect(pricePerPill([box(100, 245), box(50, 150)])).toBe(3);
		expect(pricePerPill([box(100, null)])).toBeUndefined();
	});

	it("adds up every box price, ignoring boxes without one", () => {
		expect(totalSpent([box(100, 245), box(50, null), box(100, 250)])).toBe(495);
		expect(totalSpent([count])).toBe(0);
	});

	it("defaults a new box to the last price", () => {
		expect(lastBoxPrice([box(100, 245), box(100, null)])).toBe(245);
		expect(lastBoxPrice([])).toBeUndefined();
	});

	it("lists priced boxes oldest first with the price per pill", () => {
		const older = {
			...box(100, 200),
			id: "older",
			at: "2026-06-01T10:00:00.000Z",
		};
		const newer = { ...box(50, 150), id: "newer" };
		expect(
			priceHistory([newer, box(100, null), count, older]).map((p) => [
				p.id,
				p.perPill,
			]),
		).toEqual([
			["older", 2],
			["newer", 3],
		]);
	});

	it("formats Danish kroner", () => {
		// Intl uses a no-break space before "kr."
		expect(formatKr(1234.5).replace(/\s/g, " ")).toBe("1.234,50 kr.");
	});
});
