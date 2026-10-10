import { Anchor, Divider, Modal, Stack, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { startDay } from "~/lib/dates";
import { dosesQuery, settingsQuery, useSetSetting } from "~/lib/queries";

export function SettingsModal(props: { opened: boolean; onClose: () => void }) {
	const { data: settings = {} } = useQuery(settingsQuery);
	const { data: doses = [] } = useQuery(dosesQuery);
	const setSetting = useSetSetting();

	return (
		<Modal
			opened={props.opened}
			onClose={props.onClose}
			title="Indstillinger"
			centered
		>
			<Stack>
				<DatePickerInput
					label="Første dag"
					description={
						settings.startDay
							? "Dage før denne tæller ikke som glemt."
							: "Dage før denne tæller ikke som glemt. Ikke sat, så dagen for den første dosis bruges."
					}
					value={settings.startDay ?? null}
					placeholder={dayjs(startDay(settings, doses)).format("D. MMMM YYYY")}
					onChange={(value) =>
						setSetting.mutate({ key: "startDay", value: value ?? "" })
					}
					maxDate={new Date()}
					valueFormat="D. MMMM YYYY"
					clearable
					dropdownType="modal"
				/>

				<Divider />
				<Version />
			</Stack>
		</Modal>
	);
}

function Version() {
	const short = __COMMIT_SHA__.slice(0, 7);

	return (
		<Text size="xs" c="dimmed">
			Version{" "}
			{__COMMIT_SHA__ === "dev" ? (
				"dev"
			) : (
				<Anchor
					href={`https://github.com/Kostecki/PillTracker/commit/${__COMMIT_SHA__}`}
					target="_blank"
					inherit
				>
					{short}
				</Anchor>
			)}
		</Text>
	);
}
