import {$, $as} from "./dom.ts";
import {drawBoard} from "./draw.ts";
import {burst} from "./effects.ts";
import {cloneState, type Level, makeState} from "./engine.ts";
import {fx} from "./state.ts";
import {dname, progress} from "./store.ts";

// The home screen's little scene, which loops: the dragon burns the soldier in front of it, takes off, and starts over.
let homeT0 = performance.now(),
	homeAnimT0 = 0;
const HOME_LEVEL: Level =
{
	w: 7,
	h: 3,
	map: [".......", "...T...", "......."],
	dragon:
	{
		x: 1,
		y: 1,
		d: 1,
	},
	knights: [
		{
			type: "shield",
			x: 5,
			y: 0,
			d: 3,
			prog: "W",
		},
		{
			type: "soldier",
			x: 2,
			y: 1,
			d: 3,
			prog: "W",
		},
		{
			type: "archer",
			x: 5,
			y: 2,
			d: 3,
			prog: "W",
		},
	],
};
let homeS0 = makeState(HOME_LEVEL),
	homeS1 = cloneState(homeS0),
	homePhase = 0;
export function drawHome(now: number): void
{
	const cv = $as("#home-canvas", HTMLCanvasElement);
	const dpr = window.devicePixelRatio || 1;
	const r = cv.getBoundingClientRect();
	if (cv.width !== Math.floor(r.width * dpr))
	{
		cv.width = Math.floor(r.width * dpr);
		cv.height = Math.floor(r.height * dpr);
	}
	const t = now - homeT0;
	if (t > 1400)
	{
		homeT0 = now;
		homePhase = (homePhase + 1) % 3;
		if (homePhase === 1)
		{
			// breathe fire
			homeS0 = cloneState(homeS1);
			const D = homeS1.dragon;
			const fx0 = D.x + 1;
			burst(
				D.x + 0.5 + 0.4,
				D.y + 0.5,
				30,
				{
					dir: 0,
					spread: 0.6,
					speed: 2.2,
					life: 0.5,
					size: 0.22,
					delay: 0.15,
				},
			);
			homeS1.knights[1]!.alive = false;
			burst(
				fx0 + 0.5,
				1.5,
				20,
				{
					kind: "smoke",
					speed: 0.6,
					life: 1.1,
					size: 0.25,
				},
			);
			fx.scorches = [
				{
					x: fx0,
					y: 1,
				},
			];
			fx.effects.push(
				{
					t: "glow",
					x: fx0,
					y: 1,
					t0: now,
					dur: 500,
				},
			);
		}
		else if (homePhase === 2)
		{
			homeS0 = cloneState(homeS1);
			homeS1.dragon.fly = true;
			homeS1.dragon.x = 1;
		}
		else
		{
			homeS0 = makeState(HOME_LEVEL);
			homeS1 = cloneState(homeS0);
			fx.scorches = [];
		}
		homeAnimT0 = now;
	}
	drawBoard(
		cv,
		homeS0,
		homeS1,
		Math.min(1, (now - homeAnimT0) / 500),
		now,
		{
			noShake: true,
			scorches: fx.scorches,
			name: dname(),
		},
	);
}

export function updateBestLine(): void
{
	$("#best-line").textContent = progress.endlessBest ? `Endless best: ${progress.endlessBest} waves` : "";
	$("#btn-reset-endless").classList.toggle("hidden", !progress.endlessBest);
}
