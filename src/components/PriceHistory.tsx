import "@mantine/charts/styles.css";

import { LineChart } from "@mantine/charts";
import { Paper, Stack, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { stockQuery } from "~/lib/queries";
import { formatKr, pills, priceHistory } from "~/lib/stock";

type Point = ReturnType<typeof priceHistory>[number] & { label: string };

/** Price per pill for each box over time, with the same data as a table. */
export function PriceHistory() {
	const { data: stock = [] } = useQuery(stockQuery);
	const points: Point[] = priceHistory(stock).map((p) => ({
		...p,
		label: dayjs(p.at).format("D. MMM YY"),
	}));

	return (
		<Paper withBorder p="md">
			<Stack gap="sm">
				<div>
					<Text size="sm" fw={500}>
						Pris pr. pille
					</Text>
					<Text size="xs" c="dimmed">
						For hver æske med en pris
					</Text>
				</div>

				{points.length < 2 ? (
					<Text size="sm" c="dimmed">
						{points.length === 0
							? "Tilføj en pris på en æske i Beholdning for at se prisen over tid."
							: `Indtil videre ${formatKr(points[0].perPill)} pr. pille. Kurven kommer, når der er to æsker med pris.`}
					</Text>
				) : (
					<LineChart
						h={180}
						data={points}
						dataKey="label"
						series={[{ name: "perPill", label: "Pr. pille", color: "blue.6" }]}
						curveType="linear"
						strokeWidth={2}
						dotProps={{ r: 4, strokeWidth: 2 }}
						activeDotProps={{ r: 6, strokeWidth: 2 }}
						gridAxis="y"
						tickLine="none"
						withLegend={false}
						valueFormatter={formatKr}
						yAxisProps={{ width: 72, domain: ["auto", "auto"] }}
						tooltipProps={{
							content: ({ payload }) => {
								const point = payload?.[0]?.payload as Point | undefined;
								return point ? <PriceTooltip point={point} /> : null;
							},
						}}
					/>
				)}

				{points.length > 0 && (
					<Table fz="sm" verticalSpacing={4}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Dato</Table.Th>
								<Table.Th ta="right">Æske</Table.Th>
								<Table.Th ta="right">Pr. pille</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{points.toReversed().map((p) => (
								<Table.Tr key={p.id}>
									<Table.Td>{dayjs(p.at).format("D. MMM YYYY")}</Table.Td>
									<Table.Td
										ta="right"
										style={{ fontVariantNumeric: "tabular-nums" }}
									>
										{formatKr(p.price)} · {p.amount}
									</Table.Td>
									<Table.Td
										ta="right"
										style={{ fontVariantNumeric: "tabular-nums" }}
									>
										{formatKr(p.perPill)}
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				)}
			</Stack>
		</Paper>
	);
}

function PriceTooltip(props: { point: Point }) {
	return (
		<Paper withBorder shadow="sm" px="sm" py={6}>
			<Text size="xs" c="dimmed">
				{dayjs(props.point.at).format("D. MMMM YYYY")}
			</Text>
			<Text size="sm" fw={600}>
				{formatKr(props.point.perPill)} pr. pille
			</Text>
			<Text size="xs" c="dimmed">
				{formatKr(props.point.price)} for {pills(props.point.amount)}
			</Text>
		</Paper>
	);
}
