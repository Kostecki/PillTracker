// Helpers for the REST endpoints under /api, which Home Assistant and the
// NFC shortcut call outside the app's own login

import { timingSafeEqual } from "node:crypto";

import { getDatabase } from "./db";
import { InvalidInput } from "./store";

/**
 * Runs an endpoint for a caller with the right `Authorization: Bearer` token.
 * Bad input becomes a 400 with the reason, so callers can show it.
 */
export async function withToken(
	request: Request,
	handle: (db: ReturnType<typeof getDatabase>) => unknown | Promise<unknown>,
) {
	const expected = process.env.API_TOKEN;
	if (!expected) {
		return Response.json({ error: "API_TOKEN is not set" }, { status: 503 });
	}
	// Says what's wrong, without hinting at the token itself
	const header = request.headers.get("authorization");
	const given = bearerToken(header);
	if (!given || !sameText(given, expected.trim())) {
		const error = !header
			? "unauthorized: no Authorization header"
			: !given
				? 'unauthorized: the Authorization header must be "Bearer <token>"'
				: "unauthorized: wrong token";
		return Response.json({ error }, { status: 401 });
	}

	try {
		return Response.json(await handle(getDatabase()));
	} catch (error) {
		if (error instanceof InvalidInput) {
			return Response.json({ error: error.message }, { status: 400 });
		}
		console.error(error);
		return Response.json({ error: "internal error" }, { status: 500 });
	}
}

/** A request's JSON body, or an empty object when there's none. */
export async function jsonBody<T>(request: Request): Promise<Partial<T>> {
	const text = await request.text();
	if (!text.trim()) return {};
	try {
		return JSON.parse(text);
	} catch {
		throw new InvalidInput("body is not JSON");
	}
}

/**
 * The token from an `Authorization: Bearer <token>` header. Lenient about
 * what phones tend to type: the scheme's case (HTTP says it doesn't matter)
 * and spaces around the token.
 */
export function bearerToken(header: string | null) {
	const match = /^\s*bearer\s+(\S+)\s*$/i.exec(header ?? "");
	return match?.[1];
}

function sameText(a: string, b: string) {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}
