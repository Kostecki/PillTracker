import { Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";

import { dosesQuery, stockQuery } from "~/lib/queries";
import { currentSheet } from "~/lib/stock";

import classes from "./BlisterPack.module.css";

/**
 * The blister sheet in use, with as many pills popped as have been logged
 * from it, so it can be held up against the real one.
 */
export function BlisterPack() {
	const { data: doses } = useQuery(dosesQuery);
	const { data: stock } = useQuery(stockQuery);
	if (!doses || !stock) return null;

	const sheet = currentSheet(doses, stock);
	if (!sheet) return null;

	const size = sheet.rows * sheet.columns;
	// Every unopened sheet peeks out behind the open one
	const behind = sheet.unopened;

	return (
		<Stack align="center" gap="xs">
			<div
				className={classes.pile}
				style={
					{ "--behind": behind, "--columns": sheet.columns } as CSSProperties
				}
			>
				{Array.from({ length: behind }, (_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: layers are positions
						key={i}
						className={classes.behind}
						style={{ "--layer": behind - i } as CSSProperties}
						aria-hidden
					/>
				))}
				<div
					className={classes.sheet}
					style={{
						gridTemplateColumns: `repeat(${sheet.columns}, minmax(0, 22px))`,
					}}
					role="img"
					aria-label={`Blisterpakning med ${size - sheet.taken} af ${size} piller tilbage og ${sheet.unopened} uåbnede`}
				>
					{Array.from({ length: size }, (_, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: cells are positions
							key={i}
							className={classes.pill}
							data-state={i < sheet.taken ? "taken" : "left"}
						/>
					))}
				</div>
			</div>
			<Stack gap={0} align="center">
				<Text size="xs" c="dimmed">
					{size - sheet.taken} af {size} tilbage i blisterpakningen
				</Text>
				{sheet.unopened > 0 && (
					<Text size="xs" c="dimmed">
						{sheet.unopened === 1
							? "1 uåbnet pakke"
							: `${sheet.unopened} uåbnede pakker`}
					</Text>
				)}
			</Stack>
		</Stack>
	);
}
