// Server functions the app calls. They run on the server; in the browser,
// each one is a fetch to it. The database code is imported inside the
// handlers so node:sqlite never ends up in the browser bundle.

import { createServerFn } from "@tanstack/react-start";

import type { Dose, Settings, StockEvent } from "~/lib/types";

async function store() {
	const [{ getDatabase }, store] = await Promise.all([
		import("./db"),
		import("./store"),
	]);
	return { db: getDatabase(), ...store };
}

export const getData = createServerFn({ method: "GET" }).handler(async () => {
	const { db, readAll } = await store();
	return readAll(db);
});

export const logDose = createServerFn({ method: "POST" })
	.validator((dose: Dose) => dose)
	.handler(async ({ data }) => {
		const { db, logDose } = await store();
		logDose(db, data);
	});

export const updateDoseTime = createServerFn({ method: "POST" })
	.validator((dose: Pick<Dose, "id" | "takenAt">) => dose)
	.handler(async ({ data }) => {
		const { db, updateDoseTime } = await store();
		updateDoseTime(db, data.id, data.takenAt);
	});

export const deleteDose = createServerFn({ method: "POST" })
	.validator((id: string) => id)
	.handler(async ({ data }) => {
		const { db, deleteDose } = await store();
		deleteDose(db, data);
	});

export const addStock = createServerFn({ method: "POST" })
	.validator((event: StockEvent) => event)
	.handler(async ({ data }) => {
		const { db, addStock } = await store();
		addStock(db, data);
	});

export const updateStock = createServerFn({ method: "POST" })
	.validator((event: StockEvent) => event)
	.handler(async ({ data }) => {
		const { db, updateStock } = await store();
		updateStock(db, data);
	});

export const deleteStock = createServerFn({ method: "POST" })
	.validator((id: string) => id)
	.handler(async ({ data }) => {
		const { db, deleteStock } = await store();
		deleteStock(db, data);
	});

export const setSetting = createServerFn({ method: "POST" })
	.validator((change: { key: keyof Settings; value: string }) => change)
	.handler(async ({ data }) => {
		const { db, setSetting } = await store();
		setSetting(db, data.key, data.value);
	});
