import {
	ActionIcon,
	Button,
	Divider,
	Group,
	Modal,
	NumberInput,
	Stack,
	Text,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";

import {
	dosesQuery,
	newStockEvent,
	stockQuery,
	useAddStock,
	useDeleteStock,
} from "~/lib/queries";
import {
	changeFor,
	DAYS_PER_MONTH,
	formatKr,
	lastBoxPrice,
	lastBoxSize,
	pills,
	pricePerPill,
	stockColor,
	stockStatus,
	stockSummary,
	totalSpent,
} from "~/lib/stock";
import type { StockEvent } from "~/lib/types";

import { ConfirmModal } from "./ConfirmModal";
import { EditStockModal } from "./EditStockModal";

const RECENT_EVENTS = 5;

export function StockModal(props: { opened: boolean; onClose: () => void }) {
	const { data: doses = [] } = useQuery(dosesQuery);
	const { data: stock = [] } = useQuery(stockQuery);
	const addStock = useAddStock();
	const deleteStock = useDeleteStock();
	const [editing, setEditing] = useState<StockEvent | null>(null);
	const [pendingDelete, setPendingDelete] = useState<StockEvent | null>(null);

	const status = stockStatus(doses, stock);
	const recent = stock.toReversed().slice(0, RECENT_EVENTS);
	const perPill = pricePerPill(stock);

	return (
		<Modal
			opened={props.opened}
			onClose={props.onClose}
			title="Beholdning"
			centered
		>
			<Stack gap="lg">
				<Text c={stockColor(status)}>{stockSummary(status)}</Text>

				<RefillForm
					// Remount when the stock changes so the defaults follow it
					key={`refill-${stock.length}`}
					defaultAmount={lastBoxSize(stock)}
					defaultPrice={lastBoxPrice(stock)}
					onSubmit={(amount, price) =>
						addStock.mutate(
							newStockEvent(
								"refill",
								amount,
								changeFor("refill", amount, doses, stock),
								price,
							),
						)
					}
				/>
				<AmountForm
					key={`count-${stock.length}-${doses.length}`}
					label="Ret antal"
					description="Så mange piller har du lige nu"
					defaultValue={Math.max(status?.remaining ?? 0, 0)}
					min={0}
					submitLabel="Gem"
					onSubmit={(amount) =>
						addStock.mutate(
							newStockEvent(
								"count",
								amount,
								changeFor("count", amount, doses, stock),
							),
						)
					}
				/>

				{perPill !== undefined && (
					<Stack gap={4}>
						<Divider label="Pris" labelPosition="left" />
						<PriceRow label="Pr. pille" value={formatKr(perPill)} />
						<PriceRow
							label="Om måneden"
							value={`ca. ${formatKr(perPill * DAYS_PER_MONTH)}`}
						/>
						<PriceRow label="Brugt i alt" value={formatKr(totalSpent(stock))} />
					</Stack>
				)}

				{recent.length > 0 && (
					<Stack gap="xs">
						<Divider label="Seneste" labelPosition="left" />
						{recent.map((event) => (
							<Group key={event.id} justify="space-between" wrap="nowrap">
								<div>
									<Text size="sm">
										{event.type === "refill"
											? `Ny æske · +${pills(event.amount)}${event.price != null ? ` · ${formatKr(event.price)}` : ""}`
											: `Optælling · ${pills(event.amount)}`}
									</Text>
									<Text size="xs" c="dimmed">
										{dayjs(event.at).format("D. MMM YYYY [kl.] HH:mm")}
									</Text>
								</div>
								<Group gap={4} wrap="nowrap">
									<ActionIcon
										variant="subtle"
										color="gray"
										aria-label="Ret"
										onClick={() => setEditing(event)}
									>
										<IconPencil size={16} />
									</ActionIcon>
									<ActionIcon
										variant="subtle"
										color="gray"
										aria-label="Fjern"
										onClick={() => setPendingDelete(event)}
									>
										<IconTrash size={16} />
									</ActionIcon>
								</Group>
							</Group>
						))}
					</Stack>
				)}
			</Stack>

			<EditStockModal event={editing} onClose={() => setEditing(null)} />
			<ConfirmModal
				opened={pendingDelete !== null}
				title="Fjern denne registrering?"
				message="Beholdningen bliver regnet om uden den."
				confirmLabel="Fjern"
				color="red"
				onConfirm={() => pendingDelete && deleteStock.mutate(pendingDelete.id)}
				onClose={() => setPendingDelete(null)}
			/>
		</Modal>
	);
}

function PriceRow(props: { label: string; value: string }) {
	return (
		<Group justify="space-between">
			<Text size="sm" c="dimmed">
				{props.label}
			</Text>
			<Text size="sm">{props.value}</Text>
		</Group>
	);
}

function RefillForm(props: {
	defaultAmount: number;
	defaultPrice: number | null | undefined;
	onSubmit: (amount: number, price: number | null) => void;
}) {
	const [amount, setAmount] = useState<string | number>(props.defaultAmount);
	const [price, setPrice] = useState<string | number>(props.defaultPrice ?? "");
	const validAmount =
		typeof amount === "number" && Number.isInteger(amount) && amount >= 1;
	// Price is optional: empty means unknown
	const validPrice = price === "" || (typeof price === "number" && price >= 0);

	return (
		<Stack gap={4}>
			<Text size="sm" fw={500}>
				Ny æske
			</Text>
			<Group align="flex-end" gap="xs" wrap="nowrap">
				<NumberInput
					flex={1}
					label="Antal piller"
					value={amount}
					onChange={setAmount}
					min={1}
					allowDecimal={false}
					allowNegative={false}
					inputMode="numeric"
				/>
				<NumberInput
					flex={1}
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
				<Button
					disabled={!validAmount || !validPrice}
					onClick={() =>
						props.onSubmit(
							amount as number,
							typeof price === "number" ? price : null,
						)
					}
				>
					Tilføj
				</Button>
			</Group>
		</Stack>
	);
}

function AmountForm(props: {
	label: string;
	description: string;
	defaultValue: number;
	min: number;
	submitLabel: string;
	onSubmit: (amount: number) => void;
}) {
	const [value, setValue] = useState<string | number>(props.defaultValue);
	const amount = typeof value === "number" ? value : Number.NaN;
	const valid = Number.isInteger(amount) && amount >= props.min;

	return (
		<Group align="flex-end" gap="xs" wrap="nowrap">
			<NumberInput
				flex={1}
				label={props.label}
				description={props.description}
				value={value}
				onChange={setValue}
				min={props.min}
				allowDecimal={false}
				allowNegative={false}
				inputMode="numeric"
			/>
			<Button disabled={!valid} onClick={() => props.onSubmit(amount)}>
				{props.submitLabel}
			</Button>
		</Group>
	);
}
