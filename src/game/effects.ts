import {dirAng} from "./draw.ts";
import {DX, DY, type GameEvent} from "./engine.ts";
import {renderHearts} from "./hud.ts";
import {sfx} from "./sound.ts";
import {fx, play, REDUCED, SPEEDS} from "./state.ts";
import {prefs} from "./store.ts";

// What a step looks and sounds like: sparks, smoke, floating words and board effects for each event the engine reports.

export function floatText(text: string, x: number, y: number, color = "#3b2716"): void
{
	fx.floats.push(
		{
			text,
			x,
			y,
			t0: performance.now(),
			color,
		},
	);
}
interface BurstOptions
{
	dir?: number;
	spread?: number;
	speed?: number;
	life?: number;
	kind?: string;
	size?: number;
	delay?: number;
}
export function burst(x: number, y: number, n: number, opt: BurstOptions): void
{
	for (let i = 0; i < n; i++)
	{
		const a = (opt.dir ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (opt.spread ?? Math.PI * 2);
		const sp = (opt.speed ?? 1.5) * (0.4 + Math.random() * 0.8);
		fx.particles.push(
			{
				x,
				y,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp,
				life: 0,
				max: (opt.life ?? 0.6) * (0.6 + Math.random() * 0.6),
				kind: opt.kind ?? "fire",
				c: Math.random() < 0.6 ? "236,186,76" : Math.random() < 0.5 ? "111,176,74" : "216,67,47",
				size: (opt.size ?? 0.18) * (0.6 + Math.random() * 0.8),
				delay: opt.delay ? Math.random() * opt.delay : 0,
			},
		);
	}
}
const FIZZLE =
{
	fire: "Land first to breathe fire!",
	whip: "Land first to tail whip!",
	fireball: "Land first to throw a fireball!",
	noammo: "Out of fireballs!",
	spin: "Land first to fire spin!",
};
export function handleEvents(ev: GameEvent[], act: string | null): void
{
	const D = play.currS!.dragon,
		P = play.prevS!.dragon;
	const speed = SPEEDS[prefs.speedIdx]!;
	if (act === "step" && !P.fly) sfx("step");
	for (const e of ev)
	{
		switch (e.t)
		{
			case "fire":
			{
				sfx("fire");
				const mx = P.x + 0.5 + DX[P.d]! * 0.4,
					my = P.y + 0.5 + DY[P.d]! * 0.4;
				burst(
					mx,
					my,
					40,
					{
						dir: dirAng(P.d),
						spread: 0.6,
						speed: 2.2,
						life: 0.5,
						size: 0.22,
						delay: 0.15,
					},
				);
				fx.effects.push(
					{
						t: "glow",
						x: e.x,
						y: e.y,
						t0: performance.now(),
						dur: 500,
					},
				);
				break;
			}
			case "burn":
				sfx("burn");
				burst(
					e.x + 0.5,
					e.y + 0.5,
					26,
					{
						kind: "smoke",
						speed: 0.6,
						life: 1.1,
						size: 0.25,
					},
				);
				burst(
					e.x + 0.5,
					e.y + 0.5,
					20,
					{
						kind: "ember",
						speed: 1.2,
						life: 0.8,
						size: 0.08,
					},
				);
				fx.scorches.push(
					{
						x: e.x,
						y: e.y,
					},
				);
				break;
			case "tree":
				burst(
					e.x + 0.5,
					e.y + 0.5,
					30,
					{
						speed: 0.8,
						life: 0.8,
						size: 0.2,
					},
				);
				floatText("Burnt!", e.x, e.y, "#7a3b12");
				break;
			case "clang":
				sfx("clang");
				burst(
					e.x + 0.5,
					e.y + 0.5,
					16,
					{
						kind: "spark",
						speed: 2,
						life: 0.35,
						size: 0.06,
					},
				);
				floatText(e.broke ? "Clang! Shield broke!" : "Clang!", e.x, e.y, "#3b2716");
				burst(
					e.x + 0.5,
					e.y + 0.5,
					10,
					{
						kind: "crumb",
						speed: 1.6,
						life: 0.5,
						size: 0.05,
					},
				);
				break;
			case "fizzle":
				burst(
					P.x + 0.5 + DX[P.d]! * 0.4,
					P.y + 0.5 + DY[P.d]! * 0.4,
					12,
					{
						kind: "smoke",
						speed: 0.5,
						life: 0.7,
						size: 0.15,
					},
				);
				floatText(FIZZLE[e.what], P.x, P.y, "#c4432a");
				break;
			case "curl":
				floatText("Curled up!", P.x, P.y, "#5d4ac9");
				break;
			case "blocked":
				floatText("Blocked!", D.x, D.y, "#5d4ac9");
				burst(
					D.x + 0.5,
					D.y + 0.5,
					12,
					{
						kind: "spark",
						speed: 1.6,
						life: 0.35,
						size: 0.06,
					},
				);
				sfx("clang");
				break;
			case "roar":
				sfx("roar");
				fx.effects.push(
					{
						t: "roar",
						x: e.x,
						y: e.y,
						t0: performance.now(),
						dur: Math.max(450, speed),
					},
				);
				floatText("ROAR!", e.x, e.y, "#8a3a12");
				if (!REDUCED) fx.shakeUntil = performance.now() + 250;
				break;
			case "stunned":
				break;
			case "gust":
				sfx("gust");
				fx.effects.push(
					{
						t: "gust",
						x: e.x,
						y: e.y,
						d: e.d,
						t0: performance.now(),
						dur: Math.max(420, speed * 0.9),
					},
				);
				break;
			case "drown":
				setTimeout(() =>
				{
					burst(
						e.x + 0.5,
						e.y + 0.5,
						28,
						{
							kind: "water",
							speed: 1.6,
							life: 0.7,
							size: 0.09,
						},
					);
					floatText("Splash!", e.x, e.y, "#2a6690");
					sfx("splash");
				}, speed * 0.5);
				break;
			case "spinup":
				sfx("charge");
				fx.effects.push(
					{
						t: "spinup",
						x: P.x,
						y: P.y,
						t0: performance.now(),
						dur: Math.max(400, speed),
					},
				);
				floatText("Winding up...", P.x, P.y, "#e8862f");
				break;
			case "spin":
				sfx("blast");
				for (let dd = 0; dd < 4; dd++)
				{
					const x = e.x + DX[dd]!,
						y = e.y + DY[dd]!;
					burst(
						e.x + 0.5 + DX[dd]! * 0.45,
						e.y + 0.5 + DY[dd]! * 0.45,
						24,
						{
							dir: dirAng(dd),
							spread: 0.7,
							speed: 2,
							life: 0.45,
							size: 0.22,
						},
					);
					fx.effects.push(
						{
							t: "glow",
							x,
							y,
							t0: performance.now(),
							dur: 500,
						},
					);
				}
				break;
			case "whip":
			{
				sfx("whip");
				const dur = Math.min(260, speed * 0.7);
				fx.effects.push(
					{
						t: "whip",
						x: P.x,
						y: P.y,
						d: e.d,
						t0: performance.now(),
						dur,
					},
				);
				setTimeout(() =>
				{
					burst(
						e.x + 0.5,
						e.y + 0.5,
						14,
						{
							kind: "smoke",
							speed: 0.9,
							life: 0.5,
							size: 0.12,
						},
					);
					floatText("Whack!", e.x, e.y, "#a3456b");
				}, dur * 0.45);
				break;
			}
			case "charge":
				sfx("charge");
				fx.effects.push(
					{
						t: "charge",
						x: P.x,
						y: P.y,
						d: P.d,
						t0: performance.now(),
						dur: Math.max(400, speed),
					},
				);
				floatText("Charging...", P.x, P.y, "#e8862f");
				break;
			case "launch":
				sfx("fire");
				break;
			case "fbhit":
			{
				const b0 = play.prevS!.balls.find((b) => b.id === e.id);
				const x0 = b0 ? b0.x : P.x,
					y0 = b0 ? b0.y : P.y;
				const dur = Math.min(380, speed * 0.75);
				fx.effects.push(
					{
						t: "fbgone",
						x0,
						y0,
						x1: e.x,
						y1: e.y,
						t0: performance.now(),
						dur,
					},
				);
				setTimeout(() =>
				{
					burst(
						e.x + 0.5,
						e.y + 0.5,
						e.fizzle ? 10 : 26,
						{
							kind: e.fizzle ? "smoke" : "fire",
							speed: 1.4,
							life: 0.5,
							size: e.fizzle ? 0.15 : 0.22,
						},
					);
					if (!e.fizzle && !e.wall) sfx("burn");
				}, dur);
				break;
			}
			case "armor":
				sfx("clang");
				burst(
					e.x + 0.5,
					e.y + 0.5,
					14,
					{
						kind: "spark",
						speed: 2,
						life: 0.35,
						size: 0.06,
					},
				);
				burst(
					e.x + 0.5,
					e.y + 0.5,
					10,
					{
						kind: "smoke",
						speed: 0.5,
						life: 0.7,
						size: 0.15,
					},
				);
				floatText("Armor cracked! 1 more hit", e.x, e.y, "#7a3b12");
				break;
			case "bump":
				floatText("Bump!", P.x, P.y, "#6b5236");
				break;
			case "flyfail":
				floatText("Take off first!", P.x, P.y, "#c4432a");
				burst(
					P.x + 0.5,
					P.y + 0.5,
					8,
					{
						kind: "smoke",
						speed: 0.4,
						life: 0.6,
						size: 0.12,
					},
				);
				break;
			case "cantland":
				floatText("Can't land here!", P.x, P.y, "#c4432a");
				break;
			case "takeoff":
				sfx("flap");
				break;
			case "land":
				sfx("flap");
				break;
			case "taco":
				break;
			case "blast":
				sfx("taco");
				sfx("blast");
				floatText("TOO SPICY!", e.x, e.y, "#c4432a");
				fx.shakeUntil = performance.now() + 500;
				e.cells.forEach((c, i) =>
				{
					burst(
						c[0] + 0.5,
						c[1] + 0.5,
						22,
						{
							speed: 1.2,
							life: 0.8,
							size: 0.35,
							delay: i * 0.04,
						},
					);
				});
				fx.effects.push(
					{
						t: "blast",
						x: e.x,
						y: e.y,
						d: e.d,
						n: e.cells.length,
						t0: performance.now(),
						dur: 700,
					},
				);
				break;
			case "arrow":
				sfx("arrow");
				fx.effects.push(
					{
						t: "arrow",
						x0: e.x0,
						y0: e.y0,
						x1: e.x1,
						y1: e.y1,
						t0: performance.now(),
						dur: Math.min(400, speed * 0.8),
					},
				);
				break;
			case "stab":
			{
				const kn = play.currS!.knights[e.id];
				if (kn?.type === "spearman")
				{
					// one flying spear per throw, to the farthest square reached
					const ex = fx.effects.find(
						(f) => f.t === "spear" && f.id === e.id && performance.now() - f.t0 < 20,
					);
					if (ex?.t === "spear")
					{
						ex.x1 = e.x;
						ex.y1 = e.y;
					}
					else
					{
						fx.effects.push(
							{
								t: "spear",
								id: e.id,
								x0: kn.x,
								y0: kn.y,
								x1: e.x,
								y1: e.y,
								t0: performance.now(),
								dur: Math.min(360, speed * 0.8),
							},
						);
						floatText("Throw spear!", kn.x, kn.y, "#2f7f86");
						sfx("arrow");
					}
				}
				else
					fx.effects.push(
						{
							t: "stab",
							x: e.x,
							y: e.y,
							t0: performance.now(),
							dur: 300,
						},
					);
				break;
			}
			case "trample":
				floatText("Trampled!", D.x, D.y, "#c4432a");
				break;
			case "hit":
				sfx("hit");
				fx.hitFlashUntil = performance.now() + 450;
				renderHearts(D.hp, true);
				if (!REDUCED) fx.shakeUntil = performance.now() + 250;
				floatText("Ouch!", D.x, D.y, "#d23b2b");
				break;
			case "knock":
			case "push":
				break;
		}
	}
}
