import { Alert, Loader, Stack, Text } from "@mantine/core";
import { useDocumentVisibility } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { StockLine } from "~/components/StockLine";
import { TakeButton } from "~/components/TakeButton";
import { WeekStrip } from "~/components/WeekStrip";
import { formatTime, todayKey } from "~/lib/dates";
import { dosesQuery, newDose, useLogDose } from "~/lib/queries";

export const Route = createFileRoute("/")({
	component: Today,
});

function Today() {
	const { data: doses, isPending, error } = useQuery(dosesQuery);
	const logDose = useLogDose();
	// Re-render when the app returns to the foreground so "today" rolls over
	useDocumentVisibility();

	const todayDose = doses?.find((d) => d.day === todayKey());

	return (
		<Stack align="center" gap="xl" pt="xl">
			<TakeButton
				taken={todayDose !== undefined}
				disabled={isPending}
				onPress={() => logDose.mutate(newDose())}
			/>

			{isPending ? (
				<Loader size="sm" />
			) : todayDose ? (
				<Text c="dimmed">Taget kl. {formatTime(todayDose.takenAt)}</Text>
			) : (
				<Text c="dimmed">Endnu ikke taget i dag</Text>
			)}

			<WeekStrip />

			<StockLine />

			{error && (
				<Alert color="red" title="Kunne ikke hente data" w="100%">
					{error.message}
				</Alert>
			)}
		</Stack>
	);
}
