# Dragon Code

A block-coding game where you play the dragon. Knights march on your castle running little programs you can read; you snap together your own spell from blocks (move, fly, breathe fire, loops, conditions, variables, math and your own named spells) and run it step by step to burn them all. It has a 55-level campaign that starts with a tutorial, an endless siege of generated waves, a level editor with a solver that checks a level can be won, and a shared gallery of player levels with a high-score table. It started as a single-file Claude artifact and runs as static assets on a Cloudflare Worker at dragon-code.motlin.com.

## Layout

`index.html` is the game as it came from the artifact: its markup, its stylesheet and its inline script. It saves progress, settings, variables and the level being forged in localStorage under `dc_*` keys. `src/main.ts` is the one module the build adds, and it registers the service worker. The artifact's shared gallery and high scores used the Claude artifact storage API, which is not available here, so for now the gallery says it cannot load.

## Installing and playing offline

The game installs from the browser as a standalone app and plays offline. `src/pwa/manifest.ts` holds the manifest and the fixed files the service worker keeps, and `src/pwa/worker.ts` its logic. `scripts/service-worker-build.ts` builds `src/pwa/sw.ts` to `dist/sw.js`, writes `dist/manifest.webmanifest`, and versions the worker's cache with a hash of everything it keeps, so each deploy that changes them is a new worker. `public/_headers` stops Cloudflare caching `sw.js` and the manifest.

## Icons

`scripts/icons/*.svg` are the hand-drawn sources. `just icons` copies the favicon to `public/` and renders the PNG icons with `rsvg-convert`, and `just og-image` renders the link preview `public/og.jpg` in Chromium.

## Development

- `just dev` runs the Vite dev server.
- `just worker` builds and serves `dist/` through `wrangler dev`, the way Cloudflare serves it.
- `just verify` runs lint, type checks, the build, Fallow, the pre-commit hooks, the unit tests and the Playwright tests.

Pushing to `main` deploys through `.github/workflows/deploy.yml`, which needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
