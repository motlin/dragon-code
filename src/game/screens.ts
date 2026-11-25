import {$, $$, $as} from "./dom.ts";
import {drawBoard} from "./draw.ts";
import {drawHome} from "./home.ts";
import {fx, hooks, play, screen, SPEEDS} from "./state.ts";
import {dname, prefs} from "./store.ts";

// Switching screens, keeping the boards the size of their frames, and the animation loop that draws whichever board
// is showing.

export function show(id: string): void
{
	if (id !== "play")
	{
		fx.particles = [];
		fx.effects = [];
		fx.floats = [];
	}
	$$(".screen").forEach((s) =>
	{
		s.classList.add("hidden");
	});
	$(`#scr-${id}`).classList.remove("hidden");
	screen.current = id;
	if (id === "play" || id === "editor") requestAnimationFrame(resizeBoards);
}

const animP = (now: number): number =>
	play.animT0 ? Math.min(1, (now - play.animT0) / (SPEEDS[prefs.speedIdx]! * 0.8)) : 1;
function drawPlay(now: number): void
{
	drawBoard(
		$as("#board", HTMLCanvasElement),
		play.prevS!,
		play.currS!,
		animP(now),
		now,
		{
			hover: play.hoverKnight,
			scorches: fx.scorches,
			name: dname(),
		},
	);
}

/* ---------------- ANIMATION LOOP ---------------- */
let lastNow = performance.now();
export function loop(now: number): void
{
	const dt = Math.min(0.05, (now - lastNow) / 1000);
	lastNow = now;
	for (const pt of fx.particles)
	{
		pt.life += dt;
		if (pt.life > pt.delay)
		{
			pt.x += pt.vx * dt;
			pt.y += pt.vy * dt;
			if (pt.kind === "smoke" || pt.kind === "ember") pt.vy -= dt * 0.6;
			pt.vx *= 0.97;
			pt.vy *= 0.97;
		}
	}
	fx.particles = fx.particles.filter((p) => p.life < p.delay + p.max);
	fx.floats = fx.floats.filter((f) => now - f.t0 < 1300);
	fx.effects = fx.effects.filter((e) => now - e.t0 < e.dur);
	if (screen.current === "play" && play.prevS && play.currS) drawPlay(now);
	else if (screen.current === "editor") hooks.drawEditor(now);
	else if (screen.current === "home") drawHome(now);
	requestAnimationFrame(loop);
}
function fitCanvas(cv: HTMLCanvasElement): void
{
	const wrap = cv.parentElement!;
	const r = wrap.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const w = Math.max(100, Math.floor(r.width)),
		h = Math.max(100, Math.floor(r.height));
	if (cv.width === Math.floor(w * dpr) && cv.height === Math.floor(h * dpr)) return;
	cv.style.width = `${w}px`;
	cv.style.height = `${h}px`;
	cv.width = Math.floor(w * dpr);
	cv.height = Math.floor(h * dpr);
	drawNow();
}
let resizeQueued = false;
function resizeBoards(): void
{
	if (resizeQueued) return;
	resizeQueued = true;
	requestAnimationFrame(() =>
	{
		resizeQueued = false;
		if (screen.current === "play") fitCanvas($as("#board", HTMLCanvasElement));
		if (screen.current === "editor") fitCanvas($as("#ed-board", HTMLCanvasElement));
	});
}
function drawNow(): void
{
	const now = performance.now();
	try
	{
		if (screen.current === "play" && play.prevS && play.currS) drawPlay(now);
		else if (screen.current === "editor") hooks.drawEditor(now);
	}
	catch
	{
		// The next animation frame draws it.
	}
}
export function initResize(): void
{
	window.addEventListener("resize", resizeBoards);
	const ro = new ResizeObserver(() =>
	{
		resizeBoards();
	});
	$$(".boardwrap").forEach((w) =>
	{
		ro.observe(w);
	});
}
