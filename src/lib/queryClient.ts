import { notifications } from "@mantine/notifications";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";

import { registerMutations } from "./queries";

export const WEEK = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// On the server (rendering the shell at build time) keep TanStack's
			// default of no timers, or the build never exits
			gcTime: typeof window === "undefined" ? Number.POSITIVE_INFINITY : WEEK,
			staleTime: 1000 * 30,
		},
		mutations: {
			// Only network failures are worth retrying; an error from the server
			// (bad input, not found) gives the same answer every time
			retry: (failureCount, error) =>
				error instanceof TypeError && failureCount < 3,
		},
	},
	// Every failed save ends up here, after the change has been rolled back
	mutationCache: new MutationCache({
		onError: (error) =>
			notifications.show({
				color: "red",
				title: "Kunne ikke gemme",
				message: error.message,
				autoClose: 8000,
			}),
	}),
});
registerMutations(queryClient);

/**
 * Keeps the cache and paused offline changes in localStorage. The HTML shell
 * is also rendered at build time, where there's no localStorage.
 */
export const persister: Persister =
	typeof window === "undefined"
		? {
				persistClient: async () => {},
				restoreClient: async () => undefined,
				removeClient: async () => {},
			}
		: createAsyncStoragePersister({ storage: window.localStorage });
