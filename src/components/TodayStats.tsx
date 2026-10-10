import { SimpleGrid } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
	adherence,
	byDay,
	currentStreak,
	days,
	formatPercent,
	startDay,
	typicalTime,
} from "~/lib/dates";
import { dosesQuery, settingsQuery, stockQuery } from "~/lib/queries";
import { DAYS_PER_MONTH, formatKr, pricePerPill } from "~/lib/stock";

import { StatTile } from "./StatTile";

export function TodayStats() {
	const { data: doses } = useQuery(dosesQuery);
	const { data: stock = [] } = useQuery(stockQuery);
	const { data: settings = {} } = useQuery(settingsQuery);
	if (!doses) return null;

	const month = dayjs().startOf("month");
	const { taken, due } = adherence(
		doses,
		startDay(settings, doses),
		month,
		month.endOf("month"),
	);
	const streak = currentStreak(byDay(doses));
	const time = typicalTime(doses);
	const perPill = pricePerPill(stock);

	return (
		<SimpleGrid cols={2} spacing="sm" w="100%">
			<StatTile
				label="Dage i træk"
				value={String(streak)}
				detail={streak === 1 ? "dag" : "dage"}
			/>
			<StatTile
				label="Denne måned"
				value={due > 0 ? formatPercent(taken / due) : "–"}
				detail={`${taken} af ${days(due)}`}
			/>
			<StatTile
				label="Typisk tidspunkt"
				value={time ?? "–"}
				detail="seneste 30 dage"
			/>
			{perPill !== undefined ? (
				<StatTile
					label="Om måneden"
					value={`ca. ${formatKr(perPill * DAYS_PER_MONTH)}`}
					detail={`${formatKr(perPill)} pr. pille`}
				/>
			) : (
				<StatTile
					label="Taget i alt"
					value={String(doses.length)}
					detail={doses.length === 1 ? "pille" : "piller"}
				/>
			)}
		</SimpleGrid>
	);
}
