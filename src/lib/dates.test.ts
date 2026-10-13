import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	adherence,
	byDay,
	currentStreak,
	days,
	formatPercent,
	medianTime,
	startDay,
	todayKey,
} from "./dates";
import type { Dose } from "./types";

beforeEach(() => {
	vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00") });
});

afterEach(() => {
	vi.useRealTimers();
});

function dose(day: string, time = "08:00"): Dose {
	// Local time, so the tests don't depend on the machine's time zone
	return { id: day, takenAt: dayjs(`${day}T${time}`).toISOString(), day };
}

describe("currentStreak", () => {
	it("counts back from today when today is taken", () => {
		const doses = ["2026-10-08", "2026-10-09", "2026-10-10"].map((d) =>
			dose(d),
		);
		expect(currentStreak(byDay(doses))).toBe(3);
	});

	it("doesn't break before today's pill is taken", () => {
		const doses = ["2026-10-08", "2026-10-09"].map((d) => dose(d));
		expect(currentStreak(byDay(doses))).toBe(2);
	});

	it("stops at a missed day", () => {
		const doses = ["2026-10-06", "2026-10-08", "2026-10-09", "2026-10-10"].map(
			(d) => dose(d),
		);
		expect(currentStreak(byDay(doses))).toBe(3);
	});

	it("is zero when yesterday was missed and today isn't taken", () => {
		expect(currentStreak(byDay([dose("2026-10-08")]))).toBe(0);
	});
});

describe("startDay", () => {
	it("prefers the setting", () => {
		expect(startDay({ startDay: "2026-10-01" }, [dose("2026-09-01")])).toBe(
			"2026-10-01",
		);
	});

	it("falls back to the first dose, then today", () => {
		expect(startDay({}, [dose("2026-10-05"), dose("2026-10-03")])).toBe(
			"2026-10-03",
		);
		expect(startDay({}, [])).toBe(todayKey());
	});
});

describe("days", () => {
	it("uses the Danish singular and plural", () => {
		expect(days(1)).toBe("1 dag");
		expect(days(0)).toBe("0 dage");
		expect(days(5)).toBe("5 dage");
	});
});

describe("adherence", () => {
	const october = dayjs("2026-10-01");
	const endOfOctober = october.endOf("month");

	it("counts from the first day of tracking up to today", () => {
		const doses = ["2026-10-07", "2026-10-08", "2026-10-10"].map((d) =>
			dose(d),
		);
		expect(adherence(doses, "2026-10-07", october, endOfOctober)).toEqual({
			taken: 3,
			due: 4,
		});
	});

	it("leaves today out until it's taken", () => {
		const doses = ["2026-10-08", "2026-10-09"].map((d) => dose(d));
		expect(adherence(doses, "2026-10-08", october, endOfOctober)).toEqual({
			taken: 2,
			due: 2,
		});
	});

	it("is empty on the first day before the pill is taken", () => {
		expect(adherence([], "2026-10-10", october, endOfOctober)).toEqual({
			taken: 0,
			due: 0,
		});
	});

	it("is empty for a month before tracking started", () => {
		const september = dayjs("2026-09-01");
		expect(
			adherence(
				[dose("2026-10-10")],
				"2026-10-05",
				september,
				september.endOf("month"),
			),
		).toEqual({ taken: 0, due: 0 });
	});
});

describe("medianTime", () => {
	it("is undefined without doses", () => {
		expect(medianTime([])).toBeUndefined();
	});

	it("works on any set of doses, e.g. one month", () => {
		expect(
			medianTime([
				dose("2026-09-02", "07:30"),
				dose("2026-09-03", "07:50"),
				dose("2026-09-04", "21:00"),
			]),
		).toBe("07:50");
	});
});

describe("formatPercent", () => {
	it("uses the Danish format", () => {
		expect(formatPercent(0.9).replace(/\s/g, " ")).toBe("90 %");
	});
});
