# Pill Tracker

A one-button PWA for logging when you've taken your pill, with its own small
server and a SQLite database.

- **Today**: a big button that turns green once today's pill is taken, the
  stock left, and KPI cards (streak, this month, usual time, cost).
- **History**: a calendar with a dot on each day you took it, the month's
  numbers, editable doses, and the price per pill over time.
- **Stock**: pills left and when they run out, turning orange with two weeks
  to go. New boxes (with a price, if you like) and recounts are entered in
  the app.
- **Offline**: a tap made without a connection is saved locally and sent when
  you're back online.

Stack: TanStack Start (SPA mode) with Router and Query, Mantine,
vite-plugin-pwa, and SQLite via Node's built-in `node:sqlite`.

## How it fits together

- **The app** talks to its server through TanStack Start server functions
  ([`src/server/functions.ts`](src/server/functions.ts)). It sits behind
  Pangolin, which handles the login.
- **The database** is one SQLite file
  ([`src/server/db.ts`](src/server/db.ts) has the schema). The rules live in
  [`src/server/store.ts`](src/server/store.ts):
  - `doses`: one row per dose, at most one per day. `day` is the local date
    on the phone when it was logged, so travelling never moves a dose.
  - `stock`: a ledger. `refill` is a new box, `count` a recount, and
    `change` how much each moved the stock. Pills left = the sum of `change`
    − the number of doses, so nothing depends on when things happened.
  - `settings`: `startDay`, the first day of tracking. Earlier days aren't
    counted as missed.
- **A REST API** under `/api` for callers outside the app, with
  `Authorization: Bearer <API_TOKEN>`:

  | Endpoint | Used by | Does |
  | --- | --- | --- |
  | `GET /api/today` | HA reminder | `{ day, taken, takenAt }` for the server's local day |
  | `POST /api/doses` | HA "Taget" button, NFC shortcut | Logs today's pill. Body optional: `takenAt` (ISO with offset) defaults to now. A second log for the day is ignored. |
  | `POST /api/import` | Moving data in | Imports `{ doses, stock, settings }`; existing ids are replaced, so it can run twice |

## Home Assistant and the NFC sticker

Home Assistant reminds you on your phone if today's pill isn't logged by the
`Pillepåmindelse` time (21:00), then every 30 minutes until 23:00. The
notification's **Taget** button logs the pill. HA calls the API through two
`rest_command`s; see
[`home-assistant/rest_command.yaml`](home-assistant/rest_command.yaml). The
automations live in HA (`Pillepåmindelse` and `Pillepåmindelse - Taget`).

An NFC sticker on the pill box logs the pill with one tap: an iOS Shortcuts
automation (NFC, *Run Immediately*) runs a shortcut that sends
`POST /api/doses` with the `Authorization` header and a JSON body
`{ "takenAt": <current date as ISO 8601 with time> }`.

Pangolin needs a rule that lets `/api/*` past its login (the API checks the
token itself), so HA and the shortcut can reach it from outside. HA can also
call the container directly on the local network.

## Development

```sh
pnpm install
API_TOKEN=dev pnpm dev
```

The database goes to `data/pill-tracker.sqlite` (git-ignored) unless
`DATABASE_PATH` says otherwise. `pnpm test` runs the Vitest tests (store,
stock ledger and date logic), `pnpm build` type-checks and builds to
`.output/`, `pnpm start` runs that build, and `pnpm lint` runs Biome. After
changing `public/icon.svg`, run `pnpm generate-pwa-assets`.

## Deployment

On every push to `main`, GitHub Actions builds `ghcr.io/kostecki/pill-tracker`
(running the tests first) and deploys it via Komodo, like the other projects.

The container listens on port 3000 and keeps the database in the
`pill-tracker-data` volume at `/data`, labelled for nautical-backup. See
[`docker-compose.yml`](docker-compose.yml).

| Variable | Value |
| --- | --- |
| `API_TOKEN` | Bearer token for `/api` (`openssl rand -hex 32`) |
| `TZ` | Decides "today" for `/api/today`; defaults to `Europe/Copenhagen` |

## Moving from the Google Sheet

The app used to store everything in a Google Sheet through an Apps Script.
To bring that data over once, pipe the script's response into the import
endpoint:

```sh
curl -sL "https://script.google.com/macros/s/<id>/exec?token=<TOKEN>" \
  | curl -sX POST https://<app>/api/import \
      -H "Authorization: Bearer <API_TOKEN>" \
      -H "Content-Type: application/json" \
      --data-binary @-
```

Then point HA's secrets and the NFC shortcut at the new endpoints, and the
Apps Script deployment can be archived.
