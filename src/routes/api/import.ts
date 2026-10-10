import { createFileRoute } from "@tanstack/react-router";

import type { AppData } from "~/lib/types";

/**
 * POST /api/import: imports doses, stock and settings in the shape the old
 * Google Sheet returned. Existing rows with the same id are replaced, so it
 * can safely run twice.
 */
export const Route = createFileRoute("/api/import")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { withToken, jsonBody } = await import("~/server/http");
				return withToken(request, async (db) => {
					const { importData } = await import("~/server/store");
					return {
						ok: true,
						imported: importData(db, await jsonBody<AppData>(request)),
					};
				});
			},
		},
	},
});
