# Dragon Code

A block-coding game where you play the dragon. Knights march on your castle running little programs you can read; you snap together your own spell from blocks (move, fly, breathe fire, loops, conditions, variables, math and your own named spells) and run it step by step to burn them all. It has a 55-level campaign that starts with a tutorial, an endless siege of generated waves, a level editor with a solver that checks a level can be won, and a shared gallery of player levels with a high-score table. It started as a single-file Claude artifact and runs as static assets on a Cloudflare Worker at dragon-code.motlin.com.

## Layout

`index.html` is the game's markup and `src/styles/game.css` its stylesheet. `src/main.ts` starts each part of the game on its own, so a failure in one leaves the rest working, and registers the service worker.

The game is in `src/game/`:

- `engine.ts` is the rules with no DOM: the board state, one step of the dragon and the knights, the block interpreter, the solver and the level generator. `levels/tutorial.ts` and `levels/kingdom.ts` are the 55 campaign levels, each with a winning spell, and `levels.ts` puts them in order.
- `solver.worker.ts` runs the solver and the generator in a Vite module worker, and `solver.ts` talks to it, or runs them on the page when workers are unavailable.
- `blocks.ts` is the spellbook (block definitions, the palette and the spell), `dnd.ts` dragging blocks and ovals, and `unlocks.ts` which blocks a player has earned.
- `run.ts` plays a level a step at a time and shows the win and fail dialogs, with `effects.ts`, `draw.ts`, `hud.ts`, `knights.ts` and `sound.ts` for what that looks and sounds like.
- `home.ts`, `map.ts`, `endless.ts`, `editor.ts` (the Level Forge), `gallery.ts`, `howto.ts` and `reset.ts` are the screens, `screens.ts` switches between them and runs the animation loop, and `app.ts` wires up their buttons. `state.ts` holds what the screens share, including the hooks they reach each other through.
- `store.ts` reads and writes localStorage under the artifact's `dc_*` keys: `dc_progress`, `dc_nick`, `dc_kview`, `dc_muted`, `dc_speed`, `dc_palcat`, `dc_vars` and `dc_draft`, plus `dc_player` for the API.
- `api.ts` is the client for the Worker's API.

`src/shared/` is what the game and the Worker both use: `level.ts` checks a level from outside the game, and `api.ts` holds the API's shapes and its checks on what it accepts.

## The API

`src/worker/index.ts` is a Worker in front of the static assets; only `/api/*` reaches it first. It keeps the gallery and the Hall of Flames in the D1 database `dragon-code`, whose schema is `migrations/`.

- `GET /api/levels` lists the newest 200 published levels.
- `POST /api/levels` publishes `{name, nick, data}`. The level must pass the same `sanitizeLevel` the game uses, the name be 1 to 40 characters and the nickname at most 24. Each player keeps their newest 30 levels.
- `DELETE /api/levels/:id` deletes a level, only for the player who published it.
- `GET /api/scores` lists the top 10 Endless Siege bests.
- `PUT /api/scores` saves `{best, nick}`, raising the player's best only when it is higher and always taking the nickname.
- `DELETE /api/scores` deletes the player's own entry.

A player is a device: the first time the game talks to the API it makes a random id with `crypto.randomUUID()`, keeps it in localStorage as `dc_player`, and sends it in the `x-player-id` header. The Worker stores only the SHA-256 of that id as the owner of a level or score, so the database never holds the id that proves ownership, and answers each list with `mine` marking the asker's own. Clearing site data or switching devices makes a new player, whose old levels stay in the gallery.

Every write counts toward a limit of 30 an hour per player and 60 an hour per IP address, kept in the `writes` table, and goes through `verifyHuman` in `src/worker/guard.ts` first. It lets everything through today; that is the place to check a Turnstile token or a Cloudflare Access header later.

## Installing and playing offline

The game installs from the browser as a standalone app and plays offline. `src/pwa/manifest.ts` holds the manifest and the fixed files the service worker keeps, and `src/pwa/worker.ts` its logic. `scripts/service-worker-build.ts` builds `src/pwa/sw.ts` to `dist/sw.js`, writes `dist/manifest.webmanifest`, and versions the worker's cache with a hash of everything it keeps, so each deploy that changes them is a new worker. `public/_headers` stops Cloudflare caching `sw.js` and the manifest.

## Icons

`scripts/icons/*.svg` are the hand-drawn sources. `just icons` copies the favicon to `public/` and renders the PNG icons with `rsvg-convert`, and `just og-image` renders the link preview `public/og.jpg` in Chromium.

## Development

- `just dev` runs the Vite dev server, which sends `/api` to `just worker` when that is running.
- `just worker` builds, applies the migrations to a local D1 and serves the Worker and `dist/` through `wrangler dev`, the way Cloudflare serves them.
- `just verify` runs lint, type checks, the build, Fallow, the pre-commit hooks, the unit tests and the Playwright tests.

The unit tests in `tests/unit/` cover the rules, every campaign level's solution, the solver, the generator and the level checks. `tests/worker/` calls the Worker's handler against an in-memory D1 from miniflare with the migrations and `tests/fixtures/gallery.sql` applied. The Playwright tests in `tests/browser/` run against `wrangler dev` with a fresh local D1 that gets the same migrations and fixtures.

## Deploying

Pushing to `main` deploys through `.github/workflows/deploy.yml`: once the checks pass it applies the D1 migrations with `wrangler d1 migrations apply dragon-code --remote`, then runs `wrangler deploy --domain dragon-code.motlin.com`. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. `just deploy` does the same from a machine logged in to Cloudflare.
