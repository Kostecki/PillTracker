import { Button, Group, Modal, Text } from "@mantine/core";

export function ConfirmModal(props: {
	opened: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	color?: string;
	onConfirm: () => void;
	onClose: () => void;
}) {
	return (
		<Modal
			opened={props.opened}
			onClose={props.onClose}
			title={props.title}
			centered
		>
			<Text mb="lg">{props.message}</Text>
			<Group justify="flex-end">
				<Button variant="default" onClick={props.onClose}>
					Annuller
				</Button>
				<Button
					color={props.color}
					onClick={() => {
						props.onConfirm();
						props.onClose();
					}}
				>
					{props.confirmLabel}
				</Button>
			</Group>
		</Modal>
	);
}
