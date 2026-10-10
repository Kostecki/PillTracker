#!/bin/sh
# Writes the runtime config the app fetches on startup, so the image itself
# carries no secrets. Runs via the nginx image's /docker-entrypoint.d hook.
set -eu

: "${APPS_SCRIPT_URL:?APPS_SCRIPT_URL must be set}"
: "${APPS_SCRIPT_TOKEN:?APPS_SCRIPT_TOKEN must be set}"

case "$APPS_SCRIPT_URL$APPS_SCRIPT_TOKEN" in
	*\"* | *\\*)
		echo "APPS_SCRIPT_URL and APPS_SCRIPT_TOKEN can't contain quotes or backslashes" >&2
		exit 1
		;;
esac

printf '{"scriptUrl":"%s","token":"%s"}\n' "$APPS_SCRIPT_URL" "$APPS_SCRIPT_TOKEN" \
	> /usr/share/nginx/html/config.json
