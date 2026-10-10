import { Paper, Text } from "@mantine/core";

/** A headline number: label, value and an optional line of context. */
export function StatTile(props: {
	label: string;
	value: string;
	detail?: string;
}) {
	return (
		<Paper withBorder p="md">
			<Text size="xs" c="dimmed" fw={500}>
				{props.label}
			</Text>
			<Text fz="xl" fw={600} lh={1.3}>
				{props.value}
			</Text>
			{props.detail && (
				<Text size="xs" c="dimmed">
					{props.detail}
				</Text>
			)}
		</Paper>
	);
}
