import {afterEach, beforeEach, describe, expect, it} from "vite-plus/test";
import type {GalleryLevel} from "../../src/shared/api.ts";
import type {D1Database} from "../../src/worker/env.ts";
import {handle, type Options} from "../../src/worker/index.ts";
import {envWith, freshDatabase} from "../support/worker.ts";

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const ALICE = "alice-player-0001";
const BOB = "bob-player-000002";

const BRIDGE: GalleryLevel =
{
	id: "alice-bridge",
	name: "The Bridge",
	nick: "Alice",
	created: 1794196000000,
	data:
	{
		w: 5,
		h: 3,
		map: [".....", ".~~~.", "....."],
		dragon:
		{
			x: 0,
			y: 1,
			d: 1,
		},
		knights: [
			{
				type: "soldier",
				x: 4,
				y: 1,
				d: 3,
				prog: "W",
			},
		],
	},
	mine: false,
};
const GAUNTLET: GalleryLevel =
{
	id: "bob-gauntlet",
	name: "Gauntlet",
	nick: "Bob",
	created: 1794197000000,
	data:
	{
		w: 4,
		h: 3,
		map: ["....", "....", "...."],
		dragon:
		{
			x: 0,
			y: 0,
			d: 1,
		},
		knights: [
			{
				type: "shield",
				x: 3,
				y: 0,
				d: 3,
				prog: "FU",
			},
		],
	},
	mine: false,
};

let db: D1Database;
let dispose: () => Promise<void>;

beforeEach(async () =>
{
	({db, dispose} = await freshDatabase());
});

afterEach(async () =>
{
	await dispose();
});

let ids = 0;
async function call(
	method: string,
	path: string,
	{
		body,
		player = null,
		ip = "203.0.113.7",
		options = {},
	}:
	{
		body?: unknown;
		player?: string | null;
		ip?: string | null;
		options?: Partial<Options>;
	} = {},
): Promise<
{
	status: number;
	body: unknown;
}>
{
	const headers = new Headers(
		{
			"content-type": "application/json",
		},
	);
	if (player !== null) headers.set("x-player-id", player);
	if (ip !== null) headers.set("cf-connecting-ip", ip);
	const init: RequestInit =
	{
		method,
		headers,
	};
	if (body !== undefined) init.body = typeof body === "string" ? body : JSON.stringify(body);
	const res = await handle(
		new Request(`https://dragon-code.motlin.com${path}`, init),
		envWith(db),
		{
			now: NOW,
			newId: () => `new-${++ids}`,
			...options,
		},
	);
	const text = await res.text();
	return {
		status: res.status,
		body: res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text,
	};
}

const publish = (over: Record<string, unknown> = {}): Record<string, unknown> => (
{
	name: "  Moat  ",
	nick: "Alice",
	data:
	{
		...BRIDGE.data,
	},
	...over,
});

describe("GET /api/levels", () =>
{
	it("lists the newest levels first and marks the asking player's own", async () =>
	{
		expect(
			await call(
				"GET",
				"/api/levels",
				{
					player: BOB,
				},
			),
		).toStrictEqual(
			{
				status: 200,
				body:
				{
					levels: [
						{
							...GAUNTLET,
							mine: true,
						},
						BRIDGE,
					],
				},
			},
		);
	});
});

describe("POST /api/levels", () =>
{
	it("publishes a checked level and lists it first", async () =>
	{
		const published = await call(
			"POST",
			"/api/levels",
			{
				player: ALICE,
				body: publish(
					{
						data:
						{
							...BRIDGE.data,
							dragon:
							{
								x: 0.7,
								y: 1,
								d: 5,
							},
						},
					},
				),
			},
		);
		const moat: GalleryLevel =
		{
			id: "new-" + String(ids),
			name: "Moat",
			nick: "Alice",
			created: NOW,
			data: BRIDGE.data,
			mine: true,
		};
		expect(
			{
				published,
				list: await call(
					"GET",
					"/api/levels",
					{
						player: ALICE,
					},
				),
			},
		).toStrictEqual(
			{
				published:
				{
					status: 201,
					body:
					{
						level: moat,
					},
				},
				list:
				{
					status: 200,
					body:
					{
						levels: [
							moat,
							GAUNTLET,
							{
								...BRIDGE,
								mine: true,
							},
						],
					},
				},
			},
		);
	});

	it("refuses a request with no player, a bad name or nickname, or a level the game could not play", async () =>
	{
		const results = await Promise.all(
			[
				[null, publish()],
				["short", publish()],
				[
					ALICE,
					publish(
						{
							name: " ",
						},
					),
				],
				[
					ALICE,
					publish(
						{
							name: "x".repeat(41),
						},
					),
				],
				[
					ALICE,
					publish(
						{
							nick: "y".repeat(25),
						},
					),
				],
				[
					ALICE,
					publish(
						{
							data:
							{
								...BRIDGE.data,
								knights: [],
							},
						},
					),
				],
				[ALICE, "not json"],
			].map(async ([player, body]) =>
				call(
					"POST",
					"/api/levels",
					{
						player: player as string | null,
						body,
					},
				),
			),
		);
		expect(
			results.map((r) => [
				r.status,
				(
					r.body as
					{
						error: string;
					}
				).error,
			]),
		).toStrictEqual([
			[400, "x-player-id must be 8 to 64 letters, digits, - or _"],
			[400, "x-player-id must be 8 to 64 letters, digits, - or _"],
			[400, "name must be 1 to 40 characters"],
			[400, "name must be 1 to 40 characters"],
			[400, "nick must be 0 to 24 characters"],
			[400, "data is not a playable level"],
			[400, "body must be JSON"],
		]);
	});

	it("keeps each player's newest 30 levels", async () =>
	{
		for (let i = 0; i < 31; i++)
			await call(
				"POST",
				"/api/levels",
				{
					player: BOB,
					body: publish(
						{
							name: `Level ${i}`,
						},
					),
					options:
					{
						now: NOW + i * HOUR,
					},
				},
			);
		const {body} = (await call(
			"GET",
			"/api/levels",
			{
				player: BOB,
			},
		)) as
		{
			body:
			{
				levels: GalleryLevel[];
			};
		};
		const bobs = body.levels.filter((L) => L.mine).map((L) => L.name);
		expect(bobs).toStrictEqual(
			Array.from(
				{
					length: 30,
				},
				(_, i) => `Level ${30 - i}`,
			),
		);
	});
});

describe("DELETE /api/levels/:id", () =>
{
	it("lets only the level's own player delete it", async () =>
	{
		expect([
			await call(
				"DELETE",
				"/api/levels/alice-bridge",
				{
					player: BOB,
				},
			),
			await call(
				"DELETE",
				"/api/levels/alice-bridge",
				{
					player: ALICE,
				},
			),
			await call("GET", "/api/levels"),
		]).toStrictEqual([
			{
				status: 404,
				body:
				{
					error: "no such level of yours",
				},
			},
			{
				status: 204,
				body: "",
			},
			{
				status: 200,
				body:
				{
					levels: [GAUNTLET],
				},
			},
		]);
	});
});

describe("/api/scores", () =>
{
	it("ranks the Hall of Flames by best, only ever raises a best, and takes the new nickname", async () =>
	{
		const lower = await call(
			"PUT",
			"/api/scores",
			{
				player: BOB,
				body:
				{
					best: 2,
					nick: "Bob the Red",
				},
			},
		);
		const higher = await call(
			"PUT",
			"/api/scores",
			{
				player: BOB,
				body:
				{
					best: 9,
					nick: "Bob the Red",
				},
			},
		);
		expect(
			{
				lower,
				higher,
				board: await call(
					"GET",
					"/api/scores",
					{
						player: BOB,
					},
				),
			},
		).toStrictEqual(
			{
				lower:
				{
					status: 200,
					body:
					{
						score:
						{
							nick: "Bob the Red",
							best: 4,
							mine: true,
						},
					},
				},
				higher:
				{
					status: 200,
					body:
					{
						score:
						{
							nick: "Bob the Red",
							best: 9,
							mine: true,
						},
					},
				},
				board:
				{
					status: 200,
					body:
					{
						scores: [
							{
								nick: "Bob the Red",
								best: 9,
								mine: true,
							},
							{
								nick: "Alice",
								best: 7,
								mine: false,
							},
						],
					},
				},
			},
		);
	});

	it("deletes only the asking player's entry, and refuses an impossible best", async () =>
	{
		expect([
			await call(
				"PUT",
				"/api/scores",
				{
					player: ALICE,
					body:
					{
						best: 0,
						nick: "Alice",
					},
				},
			),
			await call(
				"DELETE",
				"/api/scores",
				{
					player: ALICE,
				},
			),
			await call("GET", "/api/scores"),
		]).toStrictEqual([
			{
				status: 400,
				body:
				{
					error: "best must be a whole number from 1 to 100000",
				},
			},
			{
				status: 204,
				body: "",
			},
			{
				status: 200,
				body:
				{
					scores: [
						{
							nick: "Bob",
							best: 4,
							mine: false,
						},
					],
				},
			},
		]);
	});
});

// Saves a best of 1 for a player from an IP address and says what the Worker answered.
const putScore = async (player: string, ip: string | null, options: Partial<Options> = {}): Promise<number> =>
	(
		await call(
			"PUT",
			"/api/scores",
			{
				player,
				ip,
				body:
				{
					best: 1,
					nick: "",
				},
				options,
			},
		)
	).status;

describe("writes", () =>
{
	it("allow 30 an hour per player and 60 per IP address, counting only writes that went ahead", async () =>
	{
		const statuses: number[] = [];
		for (let i = 0; i < 31; i++) statuses.push(await putScore(ALICE, "198.51.100.1"));
		// Bob shares an IP address with three players who already made 60 writes between them.
		for (let i = 0; i < 60; i++) statuses.push(await putScore(`crowd-player-${i % 3}`, "198.51.100.2"));
		statuses.push(await putScore(BOB, "198.51.100.2"));
		statuses.push(await putScore(BOB, "198.51.100.3"));
		statuses.push(
			await putScore(
				ALICE,
				null,
				{
					now: NOW + HOUR + 1,
				},
			),
		);
		expect(statuses).toStrictEqual([
			...Array.from(
				{
					length: 30,
				},
				() => 200,
			),
			429,
			...Array.from(
				{
					length: 60,
				},
				() => 200,
			),
			429,
			200,
			200,
		]);
	});

	it("go through verifyHuman, which can refuse them before they count", async () =>
	{
		expect([
			await putScore(
				ALICE,
				null,
				{
					verifyHuman: (request) => request.headers.get("x-token") === "ok",
				},
			),
			await call("GET", "/api/scores").then(
				(r) =>
					(
						r.body as
						{
							scores: unknown[];
						}
					).scores.length,
			),
		]).toStrictEqual([403, 2]);
	});
});

describe("routing", () =>
{
	it("serves the game's files outside /api, and 404s or 405s anything else under it", async () =>
	{
		expect([
			await call("GET", "/index.html"),
			await call("GET", "/api/nope"),
			await call("PATCH", "/api/levels"),
			await call("POST", "/api/scores"),
		]).toStrictEqual([
			{
				status: 200,
				body: "asset /index.html",
			},
			{
				status: 404,
				body:
				{
					error: "not found",
				},
			},
			{
				status: 405,
				body:
				{
					error: "method not allowed",
				},
			},
			{
				status: 405,
				body:
				{
					error: "method not allowed",
				},
			},
		]);
	});
});
