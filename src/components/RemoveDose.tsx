import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import type { Dose } from "~/lib/api";
import { useDeleteDose } from "~/lib/queries";

import { ConfirmModal } from "./ConfirmModal";

export function RemoveDose(props: { dose: Dose }) {
	const deleteDose = useDeleteDose();
	const [confirming, setConfirming] = useState(false);

	return (
		<>
			<ActionIcon
				variant="subtle"
				color="gray"
				aria-label="Fjern"
				onClick={() => setConfirming(true)}
			>
				<IconTrash size={16} />
			</ActionIcon>
			<ConfirmModal
				opened={confirming}
				title="Fjern denne dosis?"
				message="Den bliver slettet fra arket."
				confirmLabel="Fjern"
				color="red"
				onConfirm={() => deleteDose.mutate(props.dose.id)}
				onClose={() => setConfirming(false)}
			/>
		</>
	);
}
