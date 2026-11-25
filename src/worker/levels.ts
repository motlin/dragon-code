import type {Level} from "../game/engine.ts";
import type {GalleryLevel, Publish} from "../shared/api.ts";
import type {D1Database, D1PreparedStatement} from "./env.ts";

// The gallery's levels: the newest 200 for everyone, at most 30 per player, and only a level's own player may delete it.
const LIST_MAX = 200;
const KEEP_PER_PLAYER = 30;

interface Row
{
	id: string;
	owner: string;
	nick: string;
	name: string;
	data: string;
	created_at: number;
}

export async function listLevels(db: D1Database, owner: string | null): Promise<GalleryLevel[]>
{
	const {results} = await db
		.prepare("SELECT id, owner, nick, name, data, created_at FROM levels ORDER BY created_at DESC, id DESC LIMIT ?")
		.bind(LIST_MAX)
		.all<Row>();
	return results.map((r) => (
	{
		id: r.id,
		name: r.name,
		nick: r.nick,
		created: r.created_at,
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Worker stored it after sanitizeLevel
		data: JSON.parse(r.data) as Level,
		mine: r.owner === owner,
	}));
}

// Saves the level, keeping only the player's newest 30 as the artifact did, along with the given statements.
export async function publishLevel(
	db: D1Database,
	owner: string,
	id: string,
	level: Publish,
	now: number,
	also: D1PreparedStatement[],
): Promise<GalleryLevel>
{
	await db.batch([
		db
			.prepare("INSERT INTO levels (id, owner, nick, name, data, created_at) VALUES (?, ?, ?, ?, ?, ?)")
			.bind(id, owner, level.nick, level.name, JSON.stringify(level.data), now),
		db
			.prepare(
				"DELETE FROM levels WHERE owner = ? AND id NOT IN (SELECT id FROM levels WHERE owner = ? ORDER BY created_at DESC, id DESC LIMIT ?)",
			)
			.bind(owner, owner, KEEP_PER_PLAYER),
		...also,
	]);
	return {
		id,
		name: level.name,
		nick: level.nick,
		created: now,
		data: level.data,
		mine: true,
	};
}

// Deletes the level if this player published it. False when there is no such level of theirs.
export async function deleteLevel(
	db: D1Database,
	owner: string,
	id: string,
	also: D1PreparedStatement[],
): Promise<boolean>
{
	const [deleted] = await db.batch([
		db.prepare("DELETE FROM levels WHERE id = ? AND owner = ? RETURNING id").bind(id, owner),
		...also,
	]);
	return (deleted?.results.length ?? 0) > 0;
}
