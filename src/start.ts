import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

// Server functions are only called by the app itself, so turn away requests
// from other sites. The /api routes Home Assistant calls aren't affected.
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

// Only the HTML document is rendered on the server; the app itself renders
// in the browser. It shows cached data and the local time straight away,
// which a server render can't match, and React reports the mismatch.
export const startInstance = createStart(() => ({
	defaultSsr: false,
	requestMiddleware: [csrfMiddleware],
}));
