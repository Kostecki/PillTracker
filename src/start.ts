import { createStart } from "@tanstack/react-start";

// Only the HTML document is rendered on the server; the app itself renders
// in the browser. It shows cached data and the local time straight away,
// which a server render can't match, and React reports the mismatch.
export const startInstance = createStart(() => ({ defaultSsr: false }));
