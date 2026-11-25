import type {GalleryLevel, Publish, ScoreRow, ScoreSubmission} from "../shared/api.ts";
import {PLAYER_HEADER} from "../shared/api.ts";
import {store} from "./store.ts";

// The gallery and the Hall of Flames, through the Worker's /api. This device is one player: a random id made once and
// kept in localStorage as dc_player, sent with every request so the Worker knows which levels and score are its own.

function playerId(): string
{
	let id = store.get("dc_player", "");
	if (!id)
	{
		id = crypto.randomUUID();
		store.set("dc_player", id);
	}
	return id;
}

// A request the Worker refused or could not answer. status is 0 when it never reached the Worker.
export class ApiError extends Error
{
	constructor(readonly status: number)
	{
		super(`the gallery answered ${status}`);
	}
}

async function call(method: string, path: string, body?: unknown): Promise<Response>
{
	const headers = new Headers(
		{
			[PLAYER_HEADER]: playerId(),
		},
	);
	const init: RequestInit =
	{
		method,
		headers,
		signal: AbortSignal.timeout(10_000),
	};
	if (body !== undefined)
	{
		headers.set("content-type", "application/json");
		init.body = JSON.stringify(body);
	}
	let res: Response;
	try
	{
		res = await fetch(path, init);
	}
	catch
	{
		throw new ApiError(0);
	}
	if (!res.ok) throw new ApiError(res.status);
	return res;
}
// oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-parameters -- the Worker sends the shapes in src/shared/api.ts
const read = async <T>(res: Response): Promise<T> => (await res.json()) as T;

export async function listLevels(): Promise<GalleryLevel[]>
{
	return (
		await read<
		{
			levels: GalleryLevel[];
		}>(await call("GET", "/api/levels"))
	).levels;
}
export async function publishLevel(level: Publish): Promise<void>
{
	await call("POST", "/api/levels", level);
}
export async function deleteLevel(id: string): Promise<void>
{
	await call("DELETE", `/api/levels/${encodeURIComponent(id)}`);
}
export async function topScores(): Promise<ScoreRow[]>
{
	return (
		await read<
		{
			scores: ScoreRow[];
		}>(await call("GET", "/api/scores"))
	).scores;
}
export async function submitScore(score: ScoreSubmission): Promise<void>
{
	await call("PUT", "/api/scores", score);
}
export async function deleteScore(): Promise<void>
{
	await call("DELETE", "/api/scores");
}
