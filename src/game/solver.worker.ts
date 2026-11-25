import {type Action, generateWave, type Level, solve} from "./engine.ts";

// The wizard's Web Worker: generates Endless Siege waves and solves levels off the main thread. src/game/solver.ts
// starts it and talks to it.
export type SolverRequest =
	|
	  {
			id: number;
			cmd: "gen";
			d: number;
			seed: number;
	  }
	|
	  {
			id: number;
			cmd: "solve";
			level: Level;
			max?: number;
	  };
export interface SolverReply
{
	id: number;
	r: Level | Action[] | null;
}

// The project's lib is the page's, so the worker's two members this needs are spelled out here.
declare const self:
{
	addEventListener: (type: "message", listener: (e: MessageEvent<SolverRequest>) => void) => void;
	postMessage: (reply: SolverReply) => void;
};

self.addEventListener("message", (e): void =>
{
	const m = e.data;
	let r: Level | Action[] | null = null;
	try
	{
		r = m.cmd === "gen" ? generateWave(m.d, m.seed, 20000) : solve(m.level, m.max ?? 60000);
	}
	catch
	{
		r = null;
	}
	const reply: SolverReply =
	{
		id: m.id,
		r,
	};
	// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker posts to the page that started it, with no origin
	self.postMessage(reply);
});
