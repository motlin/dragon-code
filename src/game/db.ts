// The shared storage a Claude artifact gets from window.claude.use('db') and its viewer from use('user'). Outside
// claude.ai there is no window.claude, so DB stays null and the gallery says it cannot load.

interface DocSnapshot
{
	id: string;
	exists: boolean;
	data: () => Record<string, unknown> | undefined;
}
export interface DocRef
{
	get: () => Promise<DocSnapshot>;
	set: (value: unknown) => Promise<void>;
	delete: () => Promise<void>;
}
interface Query
{
	get: () => Promise<
	{
		docs: DocSnapshot[];
	}>;
	orderBy: (field: string, direction: string) => Query;
	limit: (n: number) => Query;
}
export interface ArtifactDb
{
	doc: (path: string) => DocRef;
	collection: (name: string) => Query;
}
interface ArtifactUser
{
	id: () => Promise<string>;
	isOwner?: () => Promise<boolean>;
	profiles?: (ids: string[]) => Promise<Record<
		string,
		{
			name?: string;
		}
	> | null>;
}
interface ClaudeApi
{
	use: (name: string) => Promise<unknown>;
}

export const db:
{
	DB: ArtifactDb | null;
	USER: ArtifactUser | null;
	MYID: string | null;
	ISOWNER: boolean;
} =
{
	DB: null,
	USER: null,
	MYID: null,
	ISOWNER: false,
};
const host: unknown = Reflect.get(window, "claude");
const isClaude = (value: unknown): value is ClaudeApi => typeof value === "object" && value !== null && "use" in value;
const claude = isClaude(host) ? host : undefined;
export const dbInit = (async (): Promise<void> =>
{
	try
	{
		if (!claude) return;
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the artifact host's storage API
		db.DB = (await claude.use("db")) as ArtifactDb;
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the artifact host's viewer API
		const user = (await claude.use("user")) as ArtifactUser | null;
		db.USER = user;
		if (user)
		{
			try
			{
				db.MYID = await user.id();
			}
			catch
			{
				// An anonymous viewer has no id.
			}
			try
			{
				db.ISOWNER = user.isOwner ? await user.isOwner() : false;
			}
			catch
			{
				// Not the owner.
			}
		}
	}
	catch
	{
		db.DB = null;
	}
})();
export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T>
{
	return Promise.race([
		p,
		new Promise<never>((_, rej) =>
		{
			setTimeout(() =>
			{
				rej(new Error("timeout"));
			}, ms);
		}),
	]);
}
export async function profileNames(ids: string[]): Promise<Record<string, string>>
{
	const out: Record<string, string> = {};
	const user = db.USER;
	if (!user?.profiles || !ids.length) return out;
	try
	{
		const ps = await user.profiles(ids);
		for (const id of ids) out[id] = ps?.[id]?.name ?? "";
	}
	catch
	{
		// Names stay unknown.
	}
	return out;
}
export async function submitScore(score: number, nick: string): Promise<void>
{
	await dbInit;
	const {DB, MYID} = db;
	if (!DB || !MYID || score <= 0) return;
	try
	{
		const ref = DB.doc(`scores/${MYID}`);
		const s = await ref.get();
		const old = s.exists ? Number(s.data()?.["best"] ?? 0) : 0;
		if (score > old)
			await ref.set(
				{
					best: score,
					nick: nick.slice(0, 24),
					at: Date.now(),
				},
			);
		else if (s.exists && nick && s.data()?.["nick"] !== nick)
			await ref.set(
				{
					...s.data(),
					nick: nick.slice(0, 24),
				},
			);
	}
	catch
	{
		// The score stays on this device.
	}
}
