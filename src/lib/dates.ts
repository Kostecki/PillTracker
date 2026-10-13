import dayjs, { type Dayjs } from "dayjs";

import type { Dose, Settings } from "./types";

/** Current local date on this device, as YYYY-MM-DD. */
export function todayKey() {
	return dayjs().format("YYYY-MM-DD");
}

/**
 * First day of tracking: the start day from settings, otherwise the day of
 * the first dose, otherwise today.
 */
export function startDay(settings: Settings, doses: Dose[]) {
	return (
		settings.startDay ??
		doses.reduce<string | undefined>(
			(first, d) => (first === undefined || d.day < first ? d.day : first),
			undefined,
		) ??
		todayKey()
	);
}

/** "1 dag", "5 dage" */
export function days(count: number) {
	return `${count} ${count === 1 ? "dag" : "dage"}`;
}

export function formatTime(iso: string) {
	return dayjs(iso).format("HH:mm");
}

/** Doses keyed by day. There's only ever one per day. */
export function byDay(doses: Dose[]) {
	return new Map(doses.map((dose) => [dose.day, dose]));
}

/**
 * Consecutive days with at least one dose, counting back from today. A day
 * that isn't over yet doesn't break the streak, so it starts from yesterday
 * when today has no dose so far.
 */
export function currentStreak(days: Map<string, Dose>) {
	let day = dayjs();
	if (!days.has(day.format("YYYY-MM-DD"))) day = day.subtract(1, "day");

	let streak = 0;
	while (days.has(day.format("YYYY-MM-DD"))) {
		streak++;
		day = day.subtract(1, "day");
	}
	return streak;
}

/**
 * Days with a dose out of the days that should have had one, between `from`
 * and `to`, clipped to the first day of tracking and to today. Today only
 * counts once it's taken, since it isn't over yet.
 */
export function adherence(
	doses: Dose[],
	firstDay: string,
	from: Dayjs,
	to: Dayjs,
) {
	const takenDays = new Set(doses.map((d) => d.day));
	const today = dayjs().startOf("day");

	let day = from.isBefore(firstDay, "day") ? dayjs(firstDay) : from;
	day = day.startOf("day");
	let end = to.isAfter(today, "day") ? today : to.startOf("day");
	if (end.isSame(today, "day") && !takenDays.has(todayKey())) {
		end = end.subtract(1, "day");
	}

	let taken = 0;
	let due = 0;
	for (; !day.isAfter(end, "day"); day = day.add(1, "day")) {
		due++;
		if (takenDays.has(day.format("YYYY-MM-DD"))) taken++;
	}
	return { taken, due };
}

/**
 * The usual time of day of these doses, as HH:mm. The median, so one late
 * evening doesn't drag it.
 */
export function medianTime(doses: Dose[]) {
	const minutes = doses
		.map((d) => {
			const time = dayjs(d.takenAt);
			return time.hour() * 60 + time.minute();
		})
		.sort((a, b) => a - b);
	if (minutes.length === 0) return undefined;

	const middle = Math.floor(minutes.length / 2);
	const median =
		minutes.length % 2
			? minutes[middle]
			: Math.round((minutes[middle - 1] + minutes[middle]) / 2);
	return dayjs().startOf("day").add(median, "minute").format("HH:mm");
}

const percent = new Intl.NumberFormat("da-DK", {
	style: "percent",
	maximumFractionDigits: 0,
});

/** "90 %" */
export function formatPercent(share: number) {
	return percent.format(share);
}
