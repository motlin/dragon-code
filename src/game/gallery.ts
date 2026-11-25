import {sanitizeLevel} from "../shared/level.ts";
import {db, dbInit, profileNames, withTimeout} from "./db.ts";
import {$, el} from "./dom.ts";
import {drawBoard} from "./draw.ts";
import {type Level, makeState} from "./engine.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {startLevel, stopRun} from "./run.ts";
import {show} from "./screens.ts";
import {progress} from "./store.ts";

// The gallery: levels players published, to play or, for their makers, delete; and the Hall of Flames high scores.

interface GalleryLevel
{
	id: string;
	name: string;
	created: number;
	owner: string;
	nick: string;
	data: Level;
}
const str = (v: unknown, fallback = ""): string =>
	typeof v === "string" || typeof v === "number"
		? String(v)
		: v === undefined || v === null
			? fallback
			: JSON.stringify(v);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
// The first name that is not empty.
const firstName = (...names: (string | undefined)[]): string => names.find(Boolean) ?? "A mysterious dragon";
export async function openGallery(): Promise<void>
{
	stopRun(true);
	show("gallery");
	const gs = $("#gal-status"),
		gg = $("#gal-grid"),
		lb = $("#lb-body"),
		ls = $("#lb-status");
	gg.innerHTML = "";
	lb.innerHTML = "";
	gs.textContent = "Loading levels...";
	ls.textContent = "Loading scores...";
	await dbInit;
	const DB = db.DB;
	if (!DB)
	{
		gs.textContent =
			"The shared gallery needs you to be signed in to Claude to load. You can still build and test levels in the Level Forge.";
		ls.textContent = "Scores are not available right now.";
		return;
	}
	try
	{
		const snap = await withTimeout(DB.collection("levels").get(), 10000);
		const all: GalleryLevel[] = [];
		snap.docs.forEach((d) =>
		{
			const v = d.data() ?? {};
			const levels: unknown = v["levels"];
			(Array.isArray(levels) ? levels : []).forEach((L: unknown) =>
			{
				if (!isRecord(L)) return;
				const entry = L;
				const s = sanitizeLevel(entry["data"] ?? {});
				if (s && entry["id"])
					all.push(
						{
							id: str(entry["id"]),
							name: str(entry["name"], "Untitled").slice(0, 40) || "Untitled",
							created: Number(entry["created"]) || 0,
							owner: d.id,
							nick: str(v["nick"]).slice(0, 24),
							data: s,
						},
					);
			});
		});
		all.sort((a, b) => b.created - a.created);
		const names = await profileNames([...new Set(all.filter((a) => !a.nick).map((a) => a.owner))]);
		gs.textContent = all.length ? "" : "No levels yet. Be the first to forge one!";
		all.forEach((L) =>
		{
			galleryCard(gg, L, firstName(L.nick, names[L.owner]), L.owner === db.MYID || db.ISOWNER);
		});
	}
	catch
	{
		gs.textContent = "Could not reach the gallery right now. Try again in a moment.";
	}
	try
	{
		const snap = await withTimeout(DB.collection("scores").orderBy("best", "desc").limit(10).get(), 10000);
		const rows = snap.docs.map((d) => (
		{
			id: d.id,
			v: d.data() ?? {},
		}));
		const names = await profileNames(rows.filter((r) => !r.v["nick"]).map((r) => r.id));
		ls.textContent = rows.length ? "" : "No scores yet. Survive the Endless Siege to claim the top spot!";
		rows.forEach((r, i) =>
		{
			scoreRow(
				lb,
				i,
				firstName(str(r.v["nick"]), names[r.id]).slice(0, 24),
				Number(r.v["best"]) | 0,
				r.id === db.MYID,
			);
		});
	}
	catch
	{
		ls.textContent = "Could not load scores right now.";
	}
}
function galleryCard(gg: HTMLElement, L: GalleryLevel, by: string, mine: boolean): void
{
	const c = el("div", "gcard");
	const cv = el("canvas");
	c.appendChild(cv);
	c.appendChild(el("div", "gn", L.name));
	const st = progress.gallery[L.id] ?? 0;
	c.appendChild(
		el(
			"div",
			"gm",
			`by ${by} · ${L.data.w}×${L.data.h} · ${L.data.knights.length} knight${L.data.knights.length > 1 ? "s" : ""}${st ? ` · ${"★".repeat(st)}` : ""}`,
		),
	);
	const row = el("div", "row");
	const pb = el("button", "btn small fire", "Play");
	pb.addEventListener("click", (): void =>
	{
		const lv: Level =
		{
			name: L.name,
			...L.data,
		};
		startLevel(
			lv,
			{
				mode: "gallery",
				galleryId: L.id,
				key: `g${L.id}`,
				title: `${L.name} (by ${by})`,
				attempts: 0,
			},
		);
	});
	row.appendChild(pb);
	if (mine)
	{
		const dbtn = el("button", "btn small ghost", "Delete");
		dbtn.addEventListener("click", (): void =>
		{
			confirmDelete(L);
		});
		row.appendChild(dbtn);
	}
	c.appendChild(row);
	gg.appendChild(c);
	requestAnimationFrame(() =>
	{
		const r = cv.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		cv.width = r.width * dpr;
		cv.height = r.height * dpr;
		const s = makeState(L.data);
		drawBoard(
			cv,
			s,
			s,
			1,
			0,
			{
				noShake: true,
			},
		);
	});
}
function scoreRow(lb: HTMLElement, i: number, name: string, best: number, me: boolean): void
{
	const tr = el("tr");
	tr.appendChild(el("td", null, String(i + 1)));
	tr.appendChild(el("td", null, name + (me ? " (you)" : "")));
	tr.appendChild(el("td", null, String(best)));
	lb.appendChild(tr);
}
function confirmDelete(L: GalleryLevel): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, "Delete this level?"));
		c.appendChild(el("p", null, `"${L.name}" will be removed from the gallery for everyone.`));
		const r = el("div", "row");
		mBtn(r, "Delete", "fire", async () =>
		{
			try
			{
				const ref = db.DB!.doc(`levels/${L.owner}`);
				const s = await ref.get();
				if (s.exists)
				{
					const v =
					{
						...s.data(),
					};
					const levels: unknown = v["levels"];
					v["levels"] = (Array.isArray(levels) ? levels : []).filter(
						(x: unknown) => !isRecord(x) || str(x["id"]) !== L.id,
					);
					await ref.set(v);
				}
				closeModal();
				await openGallery();
			}
			catch
			{
				c.querySelector("p")!.textContent =
					"Could not delete it. Only the level's creator or the game owner can delete levels.";
			}
		});
		mBtn(r, "Cancel", "", closeModal);
		c.appendChild(r);
	});
}
