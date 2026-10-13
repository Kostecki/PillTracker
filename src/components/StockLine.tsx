import { Group, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPackage } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { dosesQuery, stockQuery } from "~/lib/queries";
import {
	stockBarColor,
	stockPercent,
	stockStatus,
	stockSummary,
} from "~/lib/stock";

import { StockModal } from "./StockModal";

export function StockLine() {
	const { data: doses } = useQuery(dosesQuery);
	const { data: stock } = useQuery(stockQuery);
	const [opened, { open, close }] = useDisclosure();

	if (!doses || !stock) return null;
	const status = stockStatus(doses, stock);

	// The bar shows how full the supply is; the text only turns red when it's
	// empty, since an empty bar has no fill left to show it
	const empty = status !== null && status.remaining <= 0;

	return (
		<>
			<Stack gap="xs">
				<UnstyledButton onClick={open}>
					<Group gap={6} c={empty ? "red" : "dimmed"}>
						<IconPackage size={16} />
						<Text size="sm" inherit>
							{stockSummary(status)}
						</Text>
					</Group>
				</UnstyledButton>
				{status && (
					<Progress
						size="xs"
						color={stockBarColor(status)}
						value={stockPercent(status, stock)}
					/>
				)}
			</Stack>
			<StockModal opened={opened} onClose={close} />
		</>
	);
}
