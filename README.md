# Pill Tracker

A one-button PWA for logging when you've taken your pill. Every dose is
added as a row in a Google Sheet via a small Apps Script web app.

- **Today**: a big button. It turns green once you've taken today's dose,
  and asks for confirmation before logging a second one.
- **History**: a calendar with a dot on each day you took it, your current
  streak, and how many days of the month you've hit.
- **Stock**: shows how many pills are left and when they run out, and turns
  orange with two weeks to go. Opening a new box (with its price, if you
  like) or correcting the count is done in the app, which also shows the
  price per pill, per month and in total.
- **Offline**: a tap made without a connection is saved locally and sent when
  you're back online.

Stack: Vite, React, TanStack Router and Query, Mantine, vite-plugin-pwa.
Served from nginx behind Pangolin.

## Google Sheet setup

1. Create a sheet, then open **Extensions → Apps Script** and paste in
   [`apps-script/Code.js`](apps-script/Code.js).
2. Under **Project Settings → Script Properties**, add `TOKEN` with a long
   random value (`openssl rand -hex 32`).
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and
   *Who has access: Anyone*. Copy the `/exec` URL.

The sheet is only a database. The app writes every row, so there's nothing
to edit by hand. The script creates two tabs on first use:

- `Log` (`Id | Taken at | Day`): one row per dose, at most one per day.
- `Stock` (`Id | At | Type | Amount | Change | Price`): a ledger. `refill` is
  a new box, `count` is a recount, and `Change` is how much each one moved
  the stock. `Price` is what a box cost in kr (optional). Pills left = the sum of `Change` − the number of doses, so nothing
  depends on when things happened.
- `Settings` (`Key | Value`): app settings, changed under the gear icon.
  `startDay` is the first day of tracking. Earlier days aren't counted as
  missed. When unset, the day of the first dose is used.

After you change the script, deploy it again (**Manage deployments → Edit →
New version**) to keep the same URL.

> The `/exec` URL is on Google's domain, so Pangolin doesn't protect it. The
> token is what keeps other people out.

## Home Assistant reminder

Home Assistant reminds you on your phone if today's pill isn't logged by the
`Pillepåmindelse` time (21:00), then every 30 minutes until 23:00. The
notification has a **Taget** button that logs the pill without opening the
app.

An NFC sticker on the pill box logs the pill with one tap, without going
through HA: an iOS Shortcuts automation (NFC, *Run Immediately*) posts a log
straight to the Apps Script, the same request the app sends.

HA talks to the same Apps Script through two `rest_command`s; see
[`home-assistant/rest_command.yaml`](home-assistant/rest_command.yaml) for
the setup. The automations themselves live in HA (`Pillepåmindelse` and
`Pillepåmindelse - Taget`).

## Development

```sh
pnpm install
cp config.example.json public/config.json   # fill in URL + token
pnpm dev
```

`pnpm build` type-checks and builds to `dist/`, `pnpm test` runs the Vitest
tests (stock ledger and date logic), and `pnpm lint` runs Biome.

## Deployment

On every push to `main`, GitHub Actions builds `ghcr.io/kostecki/pill-tracker`
and deploys it via Komodo (needs `KOMODO_STACK_ID` and the other Komodo/Tailscale
vars and secrets, same as the other projects).

The container serves the app on port 80. At startup it writes `config.json`
from two environment variables:

| Variable            | Value                        |
| ------------------- | ---------------------------- |
| `APPS_SCRIPT_URL`   | The web app's `/exec` URL    |
| `APPS_SCRIPT_TOKEN` | The `TOKEN` script property  |

See [`docker-compose.yml`](docker-compose.yml). The app caches the last good
config, so it keeps working when offline or when your Pangolin session has
expired.
