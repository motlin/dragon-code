import {TUTORIAL} from "./levels/tutorial.ts";

// Settings and progress in localStorage, under the artifact's dc_* keys. Storage that is unavailable or holds
// something unreadable reads as the default and drops writes, as the artifact did.
export const store =
{
	get<T>(k: string, d: T): T
	{
		try
		{
			const v = localStorage.getItem(k);
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- saved JSON is read back as the shape the game wrote, as the original trusted it
			return v ? (JSON.parse(v) as T) : d;
		}
		catch
		{
			return d;
		}
	},
	set(k: string, v: unknown): void
	{
		try
		{
			localStorage.setItem(k, JSON.stringify(v));
		}
		catch
		{
			// Storage is full or unavailable; the game carries on without saving.
		}
	},
};

interface Progress
{
	stars: Record<string, number>;
	gallery: Record<string, number>;
	crowns: Record<string, boolean>;
	endlessBest: number;
	v2?: number;
}

export const progress: Progress =
{
	stars: {},
	gallery: {},
	crowns: {},
	endlessBest: 0,
	...store.get<Partial<Progress>>("dc_progress", {}),
};
// Stars were once kept by level number for the first ten tutorial levels; they are kept by level name now.
if (!progress.v2)
{
	const st: Record<string, number> = {};
	for (const k in progress.stars)
	{
		const level = TUTORIAL[Number(k)];
		if (/^\d+$/.test(k) && Number(k) < 10 && level) st[level.name!] = progress.stars[k]!;
	}
	progress.stars = st;
	progress.crowns = {};
	progress.v2 = 1;
}
export const saveProgress = (): void =>
{
	store.set("dc_progress", progress);
};

export const prefs =
{
	nick: store.get("dc_nick", ""),
	knightView: store.get("dc_kview", "blocks"),
	muted: store.get("dc_muted", false),
	speedIdx: store.get("dc_speed", 0),
	palCat: store.get("dc_palcat", "move"),
};
export const dname = (): string => prefs.nick.trim();
export const dnameOr = (fallback: string): string => dname() || fallback;
