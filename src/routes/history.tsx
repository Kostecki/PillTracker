import { Box, Flex, Group, Indicator, Paper, Stack, Text } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";

import { EditDoseTime } from "~/components/EditDoseTime";
import { PriceHistory } from "~/components/PriceHistory";
import { RemoveDose } from "~/components/RemoveDose";
import { StatTile } from "~/components/StatTile";
import {
	adherence,
	byDay,
	days as daysLabel,
	formatPercent,
	formatTime,
	medianTime,
	startDay,
	todayKey,
} from "~/lib/dates";
import { dosesQuery, settingsQuery } from "~/lib/queries";

export const Route = createFileRoute("/history")({
	component: History,
});

function History() {
	const { data: doses = [] } = useQuery(dosesQuery);
	const { data: settings = {} } = useQuery(settingsQuery);
	const [selectedDay, setSelectedDay] = useState(todayKey);
	const [month, setMonth] = useState(() => dayjs().startOf("month"));

	const days = byDay(doses);
	const selectedDose = days.get(selectedDay);

	// Days before the first day of tracking weren't meant to have a dose
	const firstDay = startDay(settings, doses);
	const { taken, due } = adherence(
		doses,
		firstDay,
		month,
		month.endOf("month"),
	);
	const monthTime = medianTime(
		doses.filter((d) => dayjs(d.day).isSame(month, "month")),
	);
	const monthName = capitalize(month.format("MMMM"));

	return (
		<Stack gap="lg">
			<Group grow align="stretch">
				{/* Both cards follow the month shown in the calendar */}
				<StatTile
					label={monthName}
					value={due > 0 ? formatPercent(taken / due) : "–"}
					detail={`${taken} af ${daysLabel(due)}`}
				/>
				<StatTile
					label="Typisk tidspunkt"
					value={monthTime ?? "–"}
					detail={`i ${month.format("MMMM")}`}
				/>
			</Group>

			{/* Day details sit beside the calendar, and wrap below it on phones */}
			<Paper withBorder p="sm">
				<Flex gap="md" wrap="wrap">
					<Calendar
						nextLabel="Næste måned"
						previousLabel="Forrige måned"
						minDate={firstDay}
						maxDate={new Date()}
						onDateChange={(date) => setMonth(dayjs(date).startOf("month"))}
						getDayProps={(date) => ({
							selected: date === selectedDay,
							onClick: () => setSelectedDay(date),
						})}
						renderDay={(date) => (
							<Indicator
								size={6}
								offset={-4}
								position="bottom-center"
								disabled={!days.has(date)}
							>
								<div>{dayjs(date).date()}</div>
							</Indicator>
						)}
					/>

					<Box flex="1 1 160px" p="xs">
						<Stack gap="md">
							<Text size="sm" fw={500}>
								{capitalize(dayjs(selectedDay).format("dddd [d.] D. MMMM"))}
							</Text>
							<Group justify="space-between" gap="xs" wrap="nowrap">
								<Text c="dimmed" size="sm">
									{selectedDose
										? `Taget kl. ${formatTime(selectedDose.takenAt)}`
										: "Ikke taget"}
								</Text>
								{selectedDose && (
									<Group gap={4} wrap="nowrap">
										<EditDoseTime dose={selectedDose} />
										<RemoveDose dose={selectedDose} />
									</Group>
								)}
							</Group>
						</Stack>
					</Box>
				</Flex>
			</Paper>

			<PriceHistory />
		</Stack>
	);
}

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
