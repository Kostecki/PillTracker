import { Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { byDay, currentStreak, days, startDay, todayKey } from "~/lib/dates";
import { dosesQuery, settingsQuery } from "~/lib/queries";

import classes from "./WeekStrip.module.css";

/** The last seven days, one dot each, with the current streak below. */
export function WeekStrip() {
	const { data: doses } = useQuery(dosesQuery);
	const { data: settings = {} } = useQuery(settingsQuery);
	if (!doses) return null;

	const taken = byDay(doses);
	const firstDay = startDay(settings, doses);
	const today = todayKey();
	const streak = currentStreak(taken);

	const week = Array.from({ length: 7 }, (_, i) => {
		const date = dayjs().subtract(6 - i, "day");
		const day = date.format("YYYY-MM-DD");
		return {
			day,
			label: date.format("dd").replace(".", ""),
			// Today isn't missed until it's over, and days before tracking
			// started were never meant to have a dose
			state: taken.has(day)
				? "taken"
				: day === today
					? "pending"
					: day < firstDay
						? "before"
						: "missed",
		};
	});

	return (
		<Stack align="center" gap="xs">
			<div className={classes.week}>
				{week.map(({ day, label, state }) => (
					<div key={day} className={classes.day}>
						<Text size="xs" c="dimmed" tt="capitalize">
							{label}
						</Text>
						<span className={classes.dot} data-state={state}>
							{state === "taken" && <IconCheck size={16} stroke={3} />}
						</span>
					</div>
				))}
			</div>
			{streak > 0 && (
				<Text size="sm" c="dimmed">
					{days(streak)} i træk
				</Text>
			)}
		</Stack>
	);
}
