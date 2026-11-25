import {describe, expect, it} from "vite-plus/test";
import
{
	type Action,
	type Block,
	createRun,
	generate,
	type Level,
	type Over,
	type StepResult,
	solve,
} from "../../src/game/engine.ts";
import {LEVELS} from "../../src/game/levels.ts";

// One block per action, so a bumped step cancels only itself, exactly as the solver played it.
function spellOf(actions: Action[]): Block[]
{
	let flying = false;
	return actions.map((act, i): Block =>
	{
		if (act === "takeoff") flying = true;
		if (act === "land") flying = false;
		const id = `b${i}`;
		if (act === "step")
			return {
				id,
				type: flying ? "fly" : "move",
				n: 1,
			};
		return {
			id,
			type:
				act === "spinup" || act === "spin"
					? "firespin"
					: act === "charge"
						? "fireball"
						: act === "flyfail"
							? "fly"
							: act,
		};
	});
}

// Runs a spell to its end and says how it ended.
function outcome(level: Level, program: Block[]): Over | null
{
	const run = createRun(level, program);
	while (run.step() !== null);
	return run.s.over;
}

const field = (map: string[], knights: Level["knights"], dragon: Level["dragon"]): Level => (
{
	w: map[0]!.length,
	h: map.length,
	map,
	dragon,
	knights,
});

describe("one step of the rules", () =>
{
	it("runs each knight's next line of code after the dragon acts, looping its program", () =>
	{
		const run = createRun(
			field(
				["......"],
				[
					{
						type: "soldier",
						x: 5,
						y: 0,
						d: 3,
						prog: "FL",
					},
				],
				{
					x: 0,
					y: 0,
					d: 1,
				},
			),
			spellOf(["wait", "wait", "wait"]),
		);
		const facing = (): number[] => [
			run.s.knights[0]!.x,
			run.s.knights[0]!.y,
			run.s.knights[0]!.d,
			run.s.knights[0]!.pc,
		];
		run.step();
		const afterForward = facing();
		run.step();
		const afterLeft = facing();
		run.step();
		expect([afterForward, afterLeft, facing()]).toStrictEqual([
			[4, 0, 3, 1],
			[4, 0, 2, 0],
			[4, 0, 2, 1],
		]);
	});

	it("breathes fire on the square ahead, breaking a shield that faces it before burning the knight", () =>
	{
		const run = createRun(
			field(
				["..."],
				[
					{
						type: "shield",
						x: 1,
						y: 0,
						d: 3,
						prog: "W",
					},
				],
				{
					x: 0,
					y: 0,
					d: 1,
				},
			),
			spellOf(["attack", "attack"]),
		);
		const steps: (StepResult | null)[] = [run.step(), run.step()];
		expect(
			{
				steps,
				over: run.s.over,
			},
		).toStrictEqual(
			{
				steps: [
					{
						events: [
							{
								t: "fire",
								x: 1,
								y: 0,
								d: 1,
							},
							{
								t: "clang",
								x: 1,
								y: 0,
								id: 0,
								broke: true,
							},
						],
						blockId: "b0",
						act: "attack",
					},
					{
						events: [
							{
								t: "fire",
								x: 1,
								y: 0,
								d: 1,
							},
							{
								t: "burn",
								id: 0,
								x: 1,
								y: 0,
								big: false,
							},
						],
						blockId: "b1",
						act: "attack",
					},
				],
				over: "win",
			},
		);
	});

	it("flies over water the dragon cannot walk into, and lands beyond it", () =>
	{
		const level = field(
			[".~~.."],
			[
				{
					type: "soldier",
					x: 4,
					y: 0,
					d: 3,
					prog: "W",
				},
			],
			{
				x: 0,
				y: 0,
				d: 1,
			},
		);
		const walk = createRun(level, spellOf(["step"]));
		const walked = walk.step();
		const fly = createRun(level, spellOf(["takeoff", "step", "step", "step", "land"]));
		for (let i = 0; i < 5; i++) fly.step();
		expect(
			{
				walked: walked?.events,
				walkedTo: [walk.s.dragon.x, walk.s.dragon.fly],
				flewTo: [fly.s.dragon.x, fly.s.dragon.fly],
			},
		).toStrictEqual(
			{
				walked: [
					{
						t: "bump",
					},
				],
				walkedTo: [0, false],
				flewTo: [3, false],
			},
		);
	});
});

describe("the campaign", () =>
{
	it("is won by every level's stored solution", () =>
	{
		const names = LEVELS.map((L) => L.name);
		expect(LEVELS.map((L) => [L.name, outcome(L, spellOf(L.solution!))])).toStrictEqual(
			LEVELS.map((L) => [L.name, "win"]),
		);
		expect(new Set(names).size).toBe(55);
	});
});

describe("the wizard", () =>
{
	it("solves the first level with the shortest spell", () =>
	{
		expect(solve(LEVELS[0]!)).toStrictEqual(["step", "step", "attack"]);
	});

	it("generates the same winnable level from the same seed", () =>
	{
		const level = generate(1, 20261124)!;
		expect(
			{
				again: generate(1, 20261124),
				wins: outcome(level, spellOf(level.solution!)),
			},
		).toStrictEqual(
			{
				again: level,
				wins: "win",
			},
		);
	});
});
