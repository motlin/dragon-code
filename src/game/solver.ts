import {type Action, generateWave, type Level, solve} from "./engine.ts";
import type {SolverReply, SolverRequest} from "./solver.worker.ts";

// Runs the solver and the wave generator in a Web Worker, or on the page after a short pause when workers are
// unavailable. A call the worker has not answered in 20 seconds resolves to null.
let worker: Worker | null | false = null,
	wseq = 0;
const wpend: Record<number, (r: SolverReply["r"]) => void> = {};
function getWorker(): Worker | false
{
	if (worker !== null) return worker;
	try
	{
		const w = new Worker(
			new URL("./solver.worker.ts", import.meta.url),
			{
				type: "module",
			},
		);
		w.addEventListener("message", (e: MessageEvent<SolverReply>): void =>
		{
			const p = wpend[e.data.id];
			if (p)
			{
				// oxlint-disable-next-line typescript/no-dynamic-delete -- the pending calls are keyed by their ids
				delete wpend[e.data.id];
				p(e.data.r);
			}
		});
		w.addEventListener("error", (): void =>
		{
			worker = false;
		});
		worker = w;
	}
	catch
	{
		worker = false;
	}
	return worker;
}
type Call =
	|
	  {
			cmd: "gen";
			d: number;
			seed: number;
	  }
	|
	  {
			cmd: "solve";
			level: Level;
			max?: number;
	  };
async function workerCall(msg: Call): Promise<SolverReply["r"]>
{
	return new Promise((res) =>
	{
		const w = getWorker();
		if (!w)
		{
			setTimeout(() =>
			{
				res(msg.cmd === "gen" ? generateWave(msg.d, msg.seed, 15000) : solve(msg.level, 40000));
			}, 30);
			return;
		}
		const id = ++wseq;
		const request: SolverRequest =
		{
			...msg,
			id,
		};
		wpend[id] = res;
		// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a Worker takes no target origin
		w.postMessage(request);
		setTimeout(() =>
		{
			if (wpend[id])
			{
				// oxlint-disable-next-line typescript/no-dynamic-delete -- the pending calls are keyed by their ids
				delete wpend[id];
				res(null);
			}
		}, 20000);
	});
}
export async function generateInWorker(d: number, seed: number): Promise<Level | null>
{
	const r = await workerCall(
		{
			cmd: "gen",
			d,
			seed,
		},
	);
	return r && !Array.isArray(r) ? r : null;
}
export async function solveInWorker(level: Level, max?: number): Promise<Action[] | null>
{
	const call: Call =
	{
		cmd: "solve",
		level,
	};
	if (max !== undefined) call.max = max;
	const r = await workerCall(call);
	return Array.isArray(r) ? r : null;
}
export function stripLevel(L: Level): Level
{
	return {
		w: L.w,
		h: L.h,
		map: L.map.slice(),
		dragon:
		{
			...L.dragon,
		},
		knights: L.knights.map((k) => (
		{
			type: k.type,
			x: k.x,
			y: k.y,
			d: k.d,
			prog: k.prog,
		})),
	};
}
