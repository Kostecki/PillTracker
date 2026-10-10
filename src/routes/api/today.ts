import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/today: whether today's pill is taken, for the Home Assistant
 * reminder. "Today" is the server's local day (its TZ).
 */
export const Route = createFileRoute("/api/today")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { withToken } = await import("~/server/http");
				return withToken(request, async (db) => {
					const { dayOf } = await import("~/server/store");
					const day = dayOf(new Date().toISOString());
					const dose = db
						.prepare("SELECT taken_at AS takenAt FROM doses WHERE day = ?")
						.get(day) as { takenAt: string } | undefined;
					return {
						day,
						taken: dose !== undefined,
						takenAt: dose?.takenAt ?? null,
					};
				});
			},
		},
	},
});
