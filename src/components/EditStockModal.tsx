import { Button, Group, Modal, NumberInput, Stack } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { useState } from "react";

import type { StockEvent } from "~/lib/api";
import { useUpdateStock } from "~/lib/queries";

const PICKER_FORMAT = "YYYY-MM-DD HH:mm:ss";

/** Edit when a stock entry happened and its amount. */
export function EditStockModal(props: {
	event: StockEvent | null;
	onClose: () => void;
}) {
	return (
		<Modal
			opened={props.event !== null}
			onClose={props.onClose}
			title={props.event?.type === "count" ? "Ret optælling" : "Ret æske"}
			centered
		>
			{props.event && (
				// Keyed so the fields reset for each entry
				<EditForm
					key={props.event.id}
					event={props.event}
					onClose={props.onClose}
				/>
			)}
		</Modal>
	);
}

function EditForm(props: { event: StockEvent; onClose: () => void }) {
	const updateStock = useUpdateStock();
	const [at, setAt] = useState<string | null>(
		dayjs(props.event.at).format(PICKER_FORMAT),
	);
	const [amount, setAmount] = useState<string | number>(props.event.amount);
	const [price, setPrice] = useState<string | number>(props.event.price ?? "");
	const isRefill = props.event.type === "refill";

	const min = isRefill ? 1 : 0;
	const valid =
		at !== null &&
		typeof amount === "number" &&
		Number.isInteger(amount) &&
		amount >= min &&
		(price === "" || (typeof price === "number" && price >= 0));

	const save = () => {
		if (!valid) return;
		updateStock.mutate({
			...props.event,
			at: dayjs(at).toISOString(),
			amount,
			// Shift the change by as much as the amount was corrected
			change: props.event.change + (amount - props.event.amount),
			price: isRefill && typeof price === "number" ? price : null,
		});
		props.onClose();
	};

	return (
		<Stack>
			<DateTimePicker
				label="Tidspunkt"
				value={at}
				onChange={setAt}
				maxDate={new Date()}
				valueFormat="D. MMM YYYY [kl.] HH:mm"
				dropdownType="modal"
			/>
			<NumberInput
				label="Antal piller"
				value={amount}
				onChange={setAmount}
				min={min}
				allowDecimal={false}
				allowNegative={false}
				inputMode="numeric"
			/>
			{isRefill && (
				<NumberInput
					label="Pris (kr)"
					placeholder="Valgfri"
					value={price}
					onChange={setPrice}
					min={0}
					decimalScale={2}
					decimalSeparator=","
					thousandSeparator="."
					allowNegative={false}
					inputMode="decimal"
				/>
			)}
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
