import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "dayjs/locale/da";

import { Alert, Container, createTheme, MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications, notifications } from "@mantine/notifications";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import dayjs from "dayjs";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { configureApi, ScriptError } from "./lib/api";
import { loadConfig } from "./lib/config";
import { registerMutations } from "./lib/queries";
import { routeTree } from "./routeTree.gen";

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

dayjs.locale("da");

const WEEK = 1000 * 60 * 60 * 24 * 7;

const theme = createTheme({ primaryColor: "blue" });

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { gcTime: WEEK, staleTime: 1000 * 30 },
		mutations: {
			retry: (failureCount, error) =>
				!(error instanceof ScriptError) && failureCount < 3,
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

const persister = createAsyncStoragePersister({ storage: window.localStorage });

const router = createRouter({ routeTree, defaultPreload: "intent" });

async function main() {
	const config = await loadConfig();
	if (config) configureApi(config);

	createRoot(document.getElementById("root") as HTMLElement).render(
		<StrictMode>
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<Notifications position="top-center" />
				<DatesProvider settings={{ locale: "da", firstDayOfWeek: 1 }}>
					{config ? (
						<PersistQueryClientProvider
							client={queryClient}
							persistOptions={{ persister, maxAge: WEEK, buster: "settings" }}
							onSuccess={() =>
								queryClient
									.resumePausedMutations()
									.then(() => queryClient.invalidateQueries())
							}
						>
							<RouterProvider router={router} />
						</PersistQueryClientProvider>
					) : (
						<Container size="xs" py="xl">
							<Alert color="red" title="Mangler konfiguration">
								Kunne ikke hente /config.json. Tjek at containeren har
								APPS_SCRIPT_URL og APPS_SCRIPT_TOKEN sat, eller at du stadig er
								logget ind.
							</Alert>
						</Container>
					)}
				</DatesProvider>
			</MantineProvider>
		</StrictMode>,
	);
}

main();
