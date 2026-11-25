-- One row per level published to the gallery. owner is the SHA-256 of the publishing device's player id, so the table
-- never holds the id that proves ownership. data is the level as sanitizeLevel returned it, as JSON.
CREATE TABLE levels (
	id TEXT PRIMARY KEY,
	owner TEXT NOT NULL,
	nick TEXT NOT NULL,
	name TEXT NOT NULL,
	data TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE INDEX levels_by_created ON levels (created_at DESC, id DESC);
CREATE INDEX levels_by_owner ON levels (owner, created_at DESC, id DESC);

-- Each player's best Endless Siege for the Hall of Flames, owned the same way.
CREATE TABLE scores (
	owner TEXT PRIMARY KEY,
	nick TEXT NOT NULL,
	best INTEGER NOT NULL CHECK (best >= 1),
	updated_at INTEGER NOT NULL
);
CREATE INDEX scores_by_rank ON scores (best DESC, updated_at ASC);

-- One row per accepted write, keyed 'player:<owner>' or 'ip:<address>', kept for an hour for the rate limits.
CREATE TABLE writes (
	key TEXT NOT NULL,
	at INTEGER NOT NULL
);
CREATE INDEX writes_by_key ON writes (key, at);
