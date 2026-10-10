import { ActionIcon, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { IconPencil } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

import { formatTime } from "~/lib/dates";
import { useUpdateDose } from "~/lib/queries";
import type { Dose } from "~/lib/types";

/**
 * Change the time a dose was taken. Only the time: the day it counts for
 * stays the same, so there's still one dose per day.
 */
export function EditDoseTime(props: { dose: Dose }) {
	const [opened, setOpened] = useState(false);

	return (
		<>
			<ActionIcon
				variant="subtle"
				color="gray"
				aria-label="Ret tidspunkt"
				onClick={() => setOpened(true)}
			>
				<IconPencil size={16} />
			</ActionIcon>
			<Modal
				opened={opened}
				onClose={() => setOpened(false)}
				title="Ret tidspunkt"
				centered
			>
				{opened && (
					<EditForm dose={props.dose} onClose={() => setOpened(false)} />
				)}
			</Modal>
		</>
	);
}

function EditForm(props: { dose: Dose; onClose: () => void }) {
	const updateDose = useUpdateDose();
	const [time, setTime] = useState(formatTime(props.dose.takenAt));

	const takenAt = dayjs(`${props.dose.day} ${time}`);
	const inFuture = takenAt.isAfter(dayjs());
	const valid = /^\d{2}:\d{2}$/.test(time) && takenAt.isValid() && !inFuture;

	const save = () => {
		if (!valid) return;
		updateDose.mutate({ ...props.dose, takenAt: takenAt.toISOString() });
		props.onClose();
	};

	return (
		<Stack>
			<Text size="sm" c="dimmed">
				{dayjs(props.dose.day).format("dddd [d.] D. MMMM")}
			</Text>
			<TimeInput
				label="Taget kl."
				value={time}
				onChange={(event) => setTime(event.currentTarget.value)}
				error={inFuture && "Tidspunktet ligger i fremtiden"}
			/>
			<Group justify="flex-end">
				<Button variant="default" onClick={props.onClose}>
					Annuller
				</Button>
				<Button disabled={!valid} onClick={save}>
					Gem
				</Button>
			</Group>
		</Stack>
	);
}
