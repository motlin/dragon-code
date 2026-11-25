import {isPlayerId, PLAYER_HEADER, validatePublish, validateScore, type Validation} from "../shared/api.ts";
import type {D1PreparedStatement, Env} from "./env.ts";
import {type HumanCheck, verifyHuman} from "./guard.ts";
import {deleteLevel, listLevels, publishLevel} from "./levels.ts";
import {countWrite, overLimit} from "./limits.ts";
import {deleteScore, saveScore, topScores} from "./scores.ts";

// The Worker: /api/levels and /api/scores in front of D1, and every other path is the game's static files.
//
// A player is the random id a device sends in the x-player-id header. The Worker keeps only its SHA-256, as the owner
// of what that player publishes and of their high score, so the database never holds the id itself.

export interface Options
{
	now: number;
	verifyHuman: HumanCheck;
	newId: () => string;
}

const json = (body: unknown, status = 200): Response =>
	Response.json(
		body,
		{
			status,
			headers:
			{
				"cache-control": "no-store",
			},
		},
	);
const error = (message: string, status: number): Response =>
	json(
		{
			error: message,
		},
		status,
	);

async function sha256(text: string): Promise<string>
{
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// The owner hash of the request's player, or null when it names none.
async function ownerOf(request: Request): Promise<string | null>
{
	const id = request.headers.get(PLAYER_HEADER);
	return isPlayerId(id) ? sha256(id) : null;
}

async function bodyOf<T>(request: Request, validate: (body: unknown) => Validation<T>): Promise<Validation<T>>
{
	try
	{
		return validate(await request.json());
	}
	catch
	{
		return {
			ok: false,
			error: "body must be JSON",
		};
	}
}

// Runs a write for a player who sent a valid id, passed the human check and is under the rate limits. The write gets
// the statements that count it, to batch with its own.
async function write(
	request: Request,
	env: Env,
	options: Options,
	run: (owner: string, counted: D1PreparedStatement[]) => Promise<Response>,
): Promise<Response>
{
	const owner = await ownerOf(request);
	if (owner === null) return error(`${PLAYER_HEADER} must be 8 to 64 letters, digits, - or _`, 400);
	if (!(await options.verifyHuman(request, env))) return error("forbidden", 403);
	const ip = request.headers.get("cf-connecting-ip");
	if (await overLimit(env.DB, owner, ip, options.now)) return error("too many changes, try again later", 429);
	return run(owner, countWrite(env.DB, owner, ip, options.now));
}

async function levels(request: Request, env: Env, options: Options, id: string | null): Promise<Response>
{
	if (id === null && request.method === "GET")
		return json(
			{
				levels: await listLevels(env.DB, await ownerOf(request)),
			},
		);
	if (id === null && request.method === "POST")
	{
		const checked = await bodyOf(request, validatePublish);
		if (!checked.ok) return error(checked.error, 400);
		return write(request, env, options, async (owner, counted) =>
			json(
				{
					level: await publishLevel(env.DB, owner, options.newId(), checked.value, options.now, counted),
				},
				201,
			),
		);
	}
	if (id !== null && request.method === "DELETE")
		return write(request, env, options, async (owner, counted) =>
			(await deleteLevel(env.DB, owner, id, counted))
				? new Response(
						null,
						{
							status: 204,
						},
					)
				: error("no such level of yours", 404),
		);
	return error("method not allowed", 405);
}

async function scores(request: Request, env: Env, options: Options): Promise<Response>
{
	if (request.method === "GET")
		return json(
			{
				scores: await topScores(env.DB, await ownerOf(request)),
			},
		);
	if (request.method === "PUT")
	{
		const checked = await bodyOf(request, validateScore);
		if (!checked.ok) return error(checked.error, 400);
		return write(request, env, options, async (owner, counted) =>
			json(
				{
					score: await saveScore(env.DB, owner, checked.value, options.now, counted),
				},
			),
		);
	}
	if (request.method === "DELETE")
		return write(request, env, options, async (owner, counted) =>
		{
			await deleteScore(env.DB, owner, counted);
			return new Response(
				null,
				{
					status: 204,
				},
			);
		});
	return error("method not allowed", 405);
}

const LEVEL_PATH = /^\/api\/levels\/([A-Za-z0-9_-]{1,64})$/;

export async function handle(request: Request, env: Env, options: Partial<Options> = {}): Promise<Response>
{
	const {pathname} = new URL(request.url);
	if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
	const resolved: Options =
	{
		now: options.now ?? Date.now(),
		verifyHuman: options.verifyHuman ?? verifyHuman,
		newId: options.newId ?? ((): string => crypto.randomUUID()),
	};
	if (pathname === "/api/levels") return levels(request, env, resolved, null);
	const levelId = LEVEL_PATH.exec(pathname)?.[1];
	if (levelId !== undefined) return levels(request, env, resolved, levelId);
	if (pathname === "/api/scores") return scores(request, env, resolved);
	return error("not found", 404);
}

export default
{
	async fetch(request: Request, env: Env): Promise<Response>
	{
		return handle(request, env);
	},
};
