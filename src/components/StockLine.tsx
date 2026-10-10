import { Group, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPackage } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { dosesQuery, stockQuery } from "~/lib/queries";
import { stockColor, stockStatus, stockSummary } from "~/lib/stock";

import { StockModal } from "./StockModal";

export function StockLine() {
	const { data: doses } = useQuery(dosesQuery);
	const { data: stock } = useQuery(stockQuery);
	const [opened, { open, close }] = useDisclosure();

	if (!doses || !stock) return null;
	const status = stockStatus(doses, stock);

	return (
		<>
			<UnstyledButton onClick={open}>
				<Group gap={6} c={stockColor(status)}>
					<IconPackage size={16} />
					<Text size="sm" inherit>
						{stockSummary(status)}
					</Text>
				</Group>
			</UnstyledButton>
			<StockModal opened={opened} onClose={close} />
		</>
	);
}
