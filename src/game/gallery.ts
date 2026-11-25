import type {GalleryLevel} from "../shared/api.ts";
import {deleteLevel, listLevels, topScores} from "./api.ts";
import {$, el} from "./dom.ts";
import {drawBoard} from "./draw.ts";
import {type Level, makeState} from "./engine.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {startLevel, stopRun} from "./run.ts";
import {show} from "./screens.ts";
import {progress} from "./store.ts";

// The gallery: levels players published, to play or, for their makers, delete; and the Hall of Flames high scores.

const NO_NAME = "A mysterious dragon";
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
	const [levels, scores] = await Promise.allSettled([listLevels(), topScores()]);
	if (levels.status === "fulfilled")
	{
		gs.textContent = levels.value.length ? "" : "No levels yet. Be the first to forge one!";
		levels.value.forEach((L) =>
		{
			galleryCard(gg, L, L.nick || NO_NAME);
		});
	}
	else gs.textContent = "Could not reach the gallery right now. Try again in a moment.";
	if (scores.status === "fulfilled")
	{
		ls.textContent = scores.value.length ? "" : "No scores yet. Survive the Endless Siege to claim the top spot!";
		scores.value.forEach((r, i) =>
		{
			scoreRow(lb, i, r.nick || NO_NAME, r.best, r.mine);
		});
	}
	else ls.textContent = "Could not load scores right now.";
}
function galleryCard(gg: HTMLElement, L: GalleryLevel, by: string): void
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
	if (L.mine)
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
				await deleteLevel(L.id);
				closeModal();
				await openGallery();
			}
			catch
			{
				c.querySelector("p")!.textContent = "Could not delete it right now. Try again in a moment.";
			}
		});
		mBtn(r, "Cancel", "", closeModal);
		c.appendChild(r);
	});
}
