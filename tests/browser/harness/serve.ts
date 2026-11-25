import {execFileSync, spawn} from "node:child_process";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";

process.title = "dragon-code-harness";

// Serves dist/ and the Worker on miniflare through `wrangler dev`, against a local D1 that starts empty in a fresh
// directory and gets every migration plus tests/fixtures/gallery.sql, so each run sees the same gallery. Nothing touches
// the account.
const root = resolve(import.meta.dirname, "../../..");
const wrangler = join(root, "node_modules/.bin/wrangler");
const port = process.env["DRAGON_CODE_PORT"] ?? "4830";
const persist = mkdtempSync(join(tmpdir(), "dragon-code-e2e-"));
const env =
{
	...process.env,
	CI: "1",
	WRANGLER_SEND_METRICS: "false",
};

execFileSync(
	wrangler,
	["d1", "migrations", "apply", "dragon-code", "--local", "--persist-to", persist],
	{
		cwd: root,
		env,
		stdio: "inherit",
	},
);
execFileSync(
	wrangler,
	["d1", "execute", "dragon-code", "--local", "--persist-to", persist, "--file", "tests/fixtures/gallery.sql"],
	{
		cwd: root,
		env,
		stdio: "inherit",
	},
);
const dev = spawn(
	wrangler,
	["dev", "--port", port, "--ip", "127.0.0.1", "--persist-to", persist, "--show-interactive-dev-session=false"],
	{
		cwd: root,
		env,
		stdio: "inherit",
	},
);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => dev.kill(signal));
dev.on("exit", (code) => process.exit(code ?? 0));
