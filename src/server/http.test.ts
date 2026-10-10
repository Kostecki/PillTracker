import { describe, expect, it } from "vitest";

import { bearerToken } from "./http";

describe("bearerToken", () => {
	it("reads the token from a Bearer header", () => {
		expect(bearerToken("Bearer abc123")).toBe("abc123");
	});

	it("forgives what phones tend to type", () => {
		expect(bearerToken("bearer abc123")).toBe("abc123");
		expect(bearerToken("BEARER  abc123 ")).toBe("abc123");
		expect(bearerToken(" Bearer abc123\n")).toBe("abc123");
	});

	it("rejects anything else", () => {
		expect(bearerToken(null)).toBeUndefined();
		expect(bearerToken("abc123")).toBeUndefined();
		expect(bearerToken("Barer abc123")).toBeUndefined();
		expect(bearerToken("Bearer abc 123")).toBeUndefined();
	});
});
