// Pangolin sits in front of the app and handles the login. When its session
// expires, calls to the server are redirected to its login page on another
// domain, which fetch() reports as a network error, just like being offline.

let checking = false;

/**
 * After a call to the server failed with a network error: if we're online
 * and Pangolin turns a page request away, reload, so the browser follows the
 * redirect to the login page and comes back logged in.
 */
export async function reloadIfLoggedOut(error: unknown) {
	if (!(error instanceof TypeError) || !navigator.onLine || checking) return;
	checking = true;
	try {
		// Not a navigation, and not the cached shell's URL, so the service
		// worker leaves it to the network
		const response = await fetch("/?session", {
			redirect: "manual",
			cache: "no-store",
		});
		if (response.type === "opaqueredirect") window.location.reload();
	} catch {
		// Really offline
	} finally {
		checking = false;
	}
}
