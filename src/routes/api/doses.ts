import { createFileRoute } from "@tanstack/react-router";

import type { LogDoseInput } from "~/server/store";

/**
 * POST /api/doses: logs today's pill, for the reminder's "Taget" button and
 * the NFC shortcut. All fields are optional: `takenAt` defaults to now and
 * the day comes from it. A second log for the same day is ignored.
 */
export const Route = createFileRoute("/api/doses")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { withToken, jsonBody } = await import("~/server/http");
				return withToken(request, async (db) => {
					const { logDose } = await import("~/server/store");
					const { id, takenAt, day } = await jsonBody<LogDoseInput>(request);
					const { logged, dose } = logDose(db, { id, takenAt, day });
					return { ok: true, logged, dose };
				});
			},
		},
	},
});
