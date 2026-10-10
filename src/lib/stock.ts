import dayjs, { type Dayjs } from "dayjs";

import type { Dose, StockEvent } from "./api";
import { todayKey } from "./dates";

export const DEFAULT_BOX_SIZE = 100;

/** Warn when there's this many days (= pills) left or fewer */
export const LOW_STOCK_DAYS = 14;

export type StockStatus = {
	remaining: number;
	/** Last day the pills left cover, at one a day */
	lastDay: Dayjs;
	low: boolean;
};

/** Pills left: every stock change added up, one less for each dose. */
export function balance(doses: Dose[], stock: StockEvent[]) {
	return stock.reduce((sum, e) => sum + e.change, 0) - doses.length;
}

/**
 * How much a new entry changes the stock. A box adds its pills, a count sets
 * the stock to what was counted. The very first entry sets the starting
 * point, so doses logged before tracking began don't count against it.
 */
export function changeFor(
	type: StockEvent["type"],
	amount: number,
	doses: Dose[],
	stock: StockEvent[],
) {
	if (type === "refill" && stock.length > 0) return amount;
	return amount - balance(doses, stock);
}

export function stockStatus(
	doses: Dose[],
	stock: StockEvent[],
): StockStatus | null {
	if (stock.length === 0) return null;
	const remaining = balance(doses, stock);

	// Today still needs a pill if it hasn't been taken yet
	const takenToday = doses.some((d) => d.day === todayKey());
	const lastDay = dayjs().add(takenToday ? remaining : remaining - 1, "day");

	return { remaining, lastDay, low: remaining <= LOW_STOCK_DAYS };
}

/** Size of the last box opened, as the default for the next one */
export function lastBoxSize(stock: StockEvent[]) {
	return stock.findLast((e) => e.type === "refill")?.amount ?? DEFAULT_BOX_SIZE;
}

/** Price of the last box that has one, as the default for the next one */
export function lastBoxPrice(stock: StockEvent[]) {
	return stock.findLast((e) => e.type === "refill" && e.price != null)?.price;
}

/** Price per pill from the last box with a price, at one pill a day */
export function pricePerPill(stock: StockEvent[]) {
	const box = stock.findLast(
		(e) => e.type === "refill" && e.price != null && e.amount > 0,
	);
	return box?.price != null ? box.price / box.amount : undefined;
}

/** Everything paid for boxes so far */
export function totalSpent(stock: StockEvent[]) {
	return stock.reduce(
		(sum, e) => sum + (e.type === "refill" ? (e.price ?? 0) : 0),
		0,
	);
}

/** Boxes with a price, oldest first, with what each pill cost */
export function priceHistory(stock: StockEvent[]) {
	return stock
		.filter(
			(e): e is StockEvent & { price: number } =>
				e.type === "refill" && e.price != null && e.amount > 0,
		)
		.toSorted((a, b) => a.at.localeCompare(b.at))
		.map((e) => ({
			id: e.id,
			at: e.at,
			amount: e.amount,
			price: e.price,
			perPill: e.price / e.amount,
		}));
}

/** Days in an average month, for "per month" at one pill a day */
export const DAYS_PER_MONTH = 30;

const kr = new Intl.NumberFormat("da-DK", {
	style: "currency",
	currency: "DKK",
});

/** "245,00 kr." */
export function formatKr(amount: number) {
	return kr.format(amount);
}

/** "1 pille", "43 piller" */
export function pills(count: number) {
	return `${count} ${count === 1 ? "pille" : "piller"}`;
}

/** One-line summary, e.g. "43 piller tilbage · rækker til 22. nov." */
export function stockSummary(status: StockStatus | null) {
	if (!status) return "Hold styr på beholdningen";
	if (status.remaining <= 0) return "Ingen piller tilbage";
	return `${pills(status.remaining)} tilbage · rækker til ${status.lastDay.format("D. MMM")}`;
}

/** Mantine color for the summary: orange when running low */
export function stockColor(status: StockStatus | null) {
	if (!status) return "dimmed";
	if (status.remaining <= 0) return "red";
	return status.low ? "orange" : "dimmed";
}
