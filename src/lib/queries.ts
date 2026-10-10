import {
	type QueryClient,
	queryOptions,
	useMutation,
	useMutationState,
} from "@tanstack/react-query";

import {
	addStock,
	type Dose,
	deleteDose,
	deleteStock,
	fetchSheet,
	logDose,
	type Settings,
	type SheetData,
	type StockEvent,
	setSetting,
	updateDose,
	updateStock,
} from "./api";
import { todayKey } from "./dates";

// The whole sheet is fetched in one request, so doses and stock share a key
const sheetKey = ["sheet"] as const;

export const dosesQuery = queryOptions({
	queryKey: sheetKey,
	queryFn: fetchSheet,
	select: (data) =>
		data.doses.toSorted((a, b) => a.takenAt.localeCompare(b.takenAt)),
});

export const stockQuery = queryOptions({
	queryKey: sheetKey,
	queryFn: fetchSheet,
	select: (data) => data.stock.toSorted((a, b) => a.at.localeCompare(b.at)),
});

export const settingsQuery = queryOptions({
	queryKey: sheetKey,
	queryFn: fetchSheet,
	// Cached data from before settings existed has none
	select: (data): Settings => data.settings ?? {},
});

type SettingChange = { key: keyof Settings; value: string };

/**
 * Mutation functions live in defaults rather than in the hooks so that
 * mutations paused while offline can be persisted and resumed after a reload.
 */
export function registerMutations(queryClient: QueryClient) {
	registerListMutations(queryClient, "doses", {
		addKey: ["logDose"],
		add: logDose,
		removeKey: ["deleteDose"],
		remove: deleteDose,
		updateKey: ["updateDose"],
		update: updateDose,
	});
	registerListMutations(queryClient, "stock", {
		addKey: ["addStock"],
		add: addStock,
		removeKey: ["deleteStock"],
		remove: deleteStock,
		updateKey: ["updateStock"],
		update: updateStock,
	});

	const setSettings = (settings: Settings) =>
		queryClient.setQueryData<SheetData>(
			sheetKey,
			(old) => old && { ...old, settings },
		);

	queryClient.setMutationDefaults<void, Error, SettingChange, Settings>(
		["setSetting"],
		{
			mutationFn: ({ key, value }) => setSetting(key, value),
			onMutate: async ({ key, value }) => {
				await queryClient.cancelQueries({ queryKey: sheetKey });
				const previous =
					queryClient.getQueryData<SheetData>(sheetKey)?.settings ?? {};
				const next = { ...previous };
				if (value) next[key] = value;
				else delete next[key];
				setSettings(next);
				return previous;
			},
			onError: (_error, _change, previous) => {
				if (previous) setSettings(previous);
			},
			onSettled: () => queryClient.invalidateQueries({ queryKey: sheetKey }),
		},
	);
}

type ListKey = "doses" | "stock";
type Item<K extends ListKey> = SheetData[K][number];

/** Optimistic add/remove/update by id for one list in the sheet data. */
function registerListMutations<K extends ListKey>(
	queryClient: QueryClient,
	field: K,
	options: {
		addKey: string[];
		add: (item: Item<K>) => Promise<void>;
		removeKey: string[];
		remove: (id: string) => Promise<void>;
		updateKey?: string[];
		update?: (item: Item<K>) => Promise<void>;
	},
) {
	const update = (fn: (items: Item<K>[]) => Item<K>[]) =>
		queryClient.setQueryData<SheetData>(
			sheetKey,
			(old) =>
				old && ({ ...old, [field]: fn(old[field] as Item<K>[]) } as SheetData),
		);
	const settle = () => queryClient.invalidateQueries({ queryKey: sheetKey });

	queryClient.setMutationDefaults<void, Error, Item<K>>(options.addKey, {
		mutationFn: options.add,
		onMutate: async (item) => {
			await queryClient.cancelQueries({ queryKey: sheetKey });
			update((items) =>
				items.some((i) => i.id === item.id) ? items : [...items, item],
			);
		},
		onError: (_error, item) =>
			update((items) => items.filter((i) => i.id !== item.id)),
		onSettled: settle,
	});

	queryClient.setMutationDefaults<void, Error, string, Item<K> | undefined>(
		options.removeKey,
		{
			mutationFn: options.remove,
			onMutate: async (id) => {
				await queryClient.cancelQueries({ queryKey: sheetKey });
				const removed = (
					queryClient.getQueryData<SheetData>(sheetKey)?.[field] as
						| Item<K>[]
						| undefined
				)?.find((i) => i.id === id);
				update((items) => items.filter((i) => i.id !== id));
				return removed;
			},
			onError: (_error, _id, removed) => {
				if (removed) update((items) => [...items, removed]);
			},
			onSettled: settle,
		},
	);

	if (!options.updateKey || !options.update) return;
	const replace = (item: Item<K>) =>
		update((items) => items.map((i) => (i.id === item.id ? item : i)));

	queryClient.setMutationDefaults<void, Error, Item<K>, Item<K> | undefined>(
		options.updateKey,
		{
			mutationFn: options.update,
			onMutate: async (item) => {
				await queryClient.cancelQueries({ queryKey: sheetKey });
				const previous = (
					queryClient.getQueryData<SheetData>(sheetKey)?.[field] as
						| Item<K>[]
						| undefined
				)?.find((i) => i.id === item.id);
				replace(item);
				return previous;
			},
			onError: (_error, _item, previous) => {
				if (previous) replace(previous);
			},
			onSettled: settle,
		},
	);
}

export function useLogDose() {
	return useMutation<void, Error, Dose>({ mutationKey: ["logDose"] });
}

export function useUpdateDose() {
	return useMutation<void, Error, Dose, Dose | undefined>({
		mutationKey: ["updateDose"],
	});
}

export function useDeleteDose() {
	return useMutation<void, Error, string, Dose | undefined>({
		mutationKey: ["deleteDose"],
	});
}

export function useAddStock() {
	return useMutation<void, Error, StockEvent>({ mutationKey: ["addStock"] });
}

export function useUpdateStock() {
	return useMutation<void, Error, StockEvent, StockEvent | undefined>({
		mutationKey: ["updateStock"],
	});
}

export function useDeleteStock() {
	return useMutation<void, Error, string, StockEvent | undefined>({
		mutationKey: ["deleteStock"],
	});
}

export function useSetSetting() {
	return useMutation<void, Error, SettingChange, Settings>({
		mutationKey: ["setSetting"],
	});
}

/** True while any change is waiting for the network to come back. */
export function useHasPausedChanges() {
	return useMutationState({
		filters: { status: "pending" },
		select: (mutation) => mutation.state.isPaused,
	}).some(Boolean);
}

export function newDose(): Dose {
	return {
		id: crypto.randomUUID(),
		takenAt: new Date().toISOString(),
		day: todayKey(),
	};
}

export function newStockEvent(
	type: StockEvent["type"],
	amount: number,
	change: number,
	price: number | null = null,
): StockEvent {
	return {
		id: crypto.randomUUID(),
		at: new Date().toISOString(),
		type,
		amount,
		change,
		price,
	};
}
