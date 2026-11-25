import type {ScoreRow, ScoreSubmission} from "../shared/api.ts";
import type {D1Database, D1PreparedStatement} from "./env.ts";

// The Hall of Flames: each player's best Endless Siege, the top ten by waves and then whoever got there first.
export async function topScores(db: D1Database, owner: string | null): Promise<ScoreRow[]>
{
	const {results} = await db
		.prepare("SELECT owner, nick, best FROM scores ORDER BY best DESC, updated_at ASC LIMIT 10")
		.all<
		{
			owner: string;
			nick: string;
			best: number;
		}>();
	return results.map((r) => (
	{
		nick: r.nick,
		best: r.best,
		mine: r.owner === owner,
	}));
}

// Raises the player's best to this score if it is higher, and takes the nickname either way.
export async function saveScore(
	db: D1Database,
	owner: string,
	score: ScoreSubmission,
	now: number,
	also: D1PreparedStatement[],
): Promise<ScoreRow>
{
	const [saved] = await db.batch<
	{
		nick: string;
		best: number;
	}>([
		db
			.prepare(
				"INSERT INTO scores (owner, nick, best, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (owner) DO UPDATE SET nick = excluded.nick, updated_at = CASE WHEN excluded.best > scores.best THEN excluded.updated_at ELSE scores.updated_at END, best = MAX(scores.best, excluded.best) RETURNING nick, best",
			)
			.bind(owner, score.nick, score.best, now),
		...also,
	]);
	const row = saved?.results[0];
	if (!row) throw new Error("saving the score returned no row");
	return {
		nick: row.nick,
		best: row.best,
		mine: true,
	};
}

export async function deleteScore(db: D1Database, owner: string, also: D1PreparedStatement[]): Promise<void>
{
	await db.batch([db.prepare("DELETE FROM scores WHERE owner = ?").bind(owner), ...also]);
}
