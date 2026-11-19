import { Group, NumberInput, Text } from "@mantine/core";
import { useState } from "react";

import type { Blister } from "~/lib/types";

const MAX_SIDE = 20;

/**
 * Rows × columns of one blister sheet, both optional. Holds its own input
 * state; `blister` is the layout, or null when it's left empty, and `valid`
 * is false while only one side is filled in or a side is out of range.
 */
export function useBlisterFields(initial: Blister | null | undefined) {
	const [rows, setRows] = useState<string | number>(initial?.rows ?? "");
	const [columns, setColumns] = useState<string | number>(
		initial?.columns ?? "",
	);

	const side = (v: string | number) =>
		typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_SIDE;
	const empty = rows === "" && columns === "";
	const valid = empty || (side(rows) && side(columns));
	const blister: Blister | null =
		!empty && valid
			? { rows: rows as number, columns: columns as number }
			: null;

	const fields = (
		<Group align="flex-end" gap="xs" wrap="nowrap">
			<NumberInput
				flex={1}
				label="Blisterpakning"
				placeholder="Rækker"
				value={rows}
				onChange={setRows}
				min={1}
				max={MAX_SIDE}
				allowDecimal={false}
				allowNegative={false}
				inputMode="numeric"
			/>
			<Text pb={8} c="dimmed">
				×
			</Text>
			<NumberInput
				flex={1}
				aria-label="Piller pr. række"
				placeholder="Piller pr. række"
				value={columns}
				onChange={setColumns}
				min={1}
				max={MAX_SIDE}
				allowDecimal={false}
				allowNegative={false}
				inputMode="numeric"
			/>
		</Group>
	);

	return { blister, valid, fields };
}
