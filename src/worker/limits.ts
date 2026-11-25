import type {D1Database, D1PreparedStatement} from "./env.ts";

// A cap on writes per player and per IP address over the last hour, kept in D1: one row per accepted write, keyed
// 'player:<owner hash>' or 'ip:<address>'. Reads are not limited.
const HOUR_MS = 3_600_000;
const PLAYER_LIMIT = 30;
const IP_LIMIT = 60;

const limitKeys = (owner: string, ip: string | null): [string, number][] =>
	ip === null
		? [[`player:${owner}`, PLAYER_LIMIT]]
		: [
				[`player:${owner}`, PLAYER_LIMIT],
				[`ip:${ip}`, IP_LIMIT],
			];

// True when this player, or this IP address when there is one, already has its hour's worth of writes.
export async function overLimit(db: D1Database, owner: string, ip: string | null, now: number): Promise<boolean>
{
	const keys = limitKeys(owner, ip);
	const {results} = await db
		.prepare(
			`SELECT key, COUNT(*) AS n FROM writes WHERE at > ? AND key IN (${keys.map(() => "?").join(", ")}) GROUP BY key`,
		)
		.bind(now - HOUR_MS, ...keys.map(([key]) => key))
		.all<
		{
			key: string;
			n: number;
		}>();
	return keys.some(([key, limit]) => (results.find((r) => r.key === key)?.n ?? 0) >= limit);
}

// The statements that count a write against its limits and drop counts older than an hour, to batch with the write.
export function countWrite(db: D1Database, owner: string, ip: string | null, now: number): D1PreparedStatement[]
{
	return [
		...limitKeys(owner, ip).map(([key]) => db.prepare("INSERT INTO writes (key, at) VALUES (?, ?)").bind(key, now)),
		db.prepare("DELETE FROM writes WHERE at <= ?").bind(now - HOUR_MS),
	];
}
