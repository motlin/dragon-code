import {$} from "./dom.ts";
import {countBlocks} from "./engine.ts";
import {HEART} from "./icons.ts";
import {play} from "./state.ts";
import {paletteBlocks} from "./unlocks.ts";

// The hearts, attempts, fireballs, crown goal and dragon eggs above the board.
export function renderHearts(hp: number, shake = false): void
{
	const h = $("#hearts");
	h.innerHTML = "";
	for (let i = 0; i < 3; i++)
		h.insertAdjacentHTML("beforeend", HEART.replace("FILL", i < hp ? "#d23b2b" : "#e8d9b5"));
	if (shake)
	{
		h.classList.remove("shake");
		void h.offsetWidth;
		h.classList.add("shake");
	}
}
export function startHp(): number
{
	return play.level?.hearts ?? 3;
}
export function starsFor(att: number): number
{
	return att <= 1 ? 3 : att <= 3 ? 2 : 1;
}
export function updateHud(): void
{
	const ctx = play.ctx!;
	const a = $("#hud-att"),
		e = $("#hud-eggs");
	if (ctx.mode === "endless")
	{
		a.textContent = `Wave ${ctx.wave}`;
		e.classList.remove("hidden");
		e.textContent = `Dragon eggs: ${"●".repeat(ctx.eggs!)}${"○".repeat(Math.max(0, 3 - ctx.eggs!))}`;
	}
	else if (ctx.mode === "test")
	{
		a.textContent = "Testing your level";
		e.classList.add("hidden");
	}
	else
	{
		e.classList.add("hidden");
		// while a run is going, show what THIS run is worth; otherwise what the next run will be worth
		const live = play.running || !!play.runner;
		const n = live ? starsFor(ctx.attempts) : starsFor(ctx.attempts + 1);
		a.textContent = `Attempts: ${ctx.attempts}  ·  ${live ? "this run is worth " : "next run is worth "}${"★".repeat(n)}${"☆".repeat(3 - n)}`;
	}
	$("#btn-hint").classList.toggle("hidden", !(ctx.mode !== "endless" && ctx.attempts >= 3));
	updateCrown();
	updateAmmo();
}
export function updateAmmo(): void
{
	const a = $("#hud-ammo"),
		level = play.level;
	if (!level) return;
	const allowed = paletteBlocks().includes("fireball");
	if (!allowed)
	{
		a.classList.add("hidden");
		return;
	}
	const n = play.currS ? play.currS.dragon.ammo : 2;
	const max = level.fireballs ?? 2;
	a.classList.remove("hidden");
	a.textContent = `Fireballs: ${"●".repeat(n)}${"○".repeat(Math.max(0, max - n))}`;
}
export function updateCrown(): void
{
	const c = $("#hud-crown"),
		level = play.level;
	if (!level?.crown || play.ctx?.mode === "test")
	{
		c.classList.add("hidden");
		return;
	}
	const n = countBlocks(play.prog);
	c.classList.remove("hidden");
	c.textContent = `♛ Crown: ${level.crown} blocks or fewer`;
	c.classList.toggle("ok", n > 0 && n <= level.crown);
	c.title = `Win using ${level.crown} blocks or fewer to earn the crown. Loops and If blocks help!`;
}
