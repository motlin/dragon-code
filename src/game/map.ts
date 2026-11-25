import {BDEF} from "./blocks.ts";
import {$, el} from "./dom.ts";
import {LEVELS, NT} from "./levels.ts";
import {startLevel, stopRun} from "./run.ts";
import {show} from "./screens.ts";
import {progress} from "./store.ts";
import {ALL_BLOCKS, unlockedBlocks} from "./unlocks.ts";

// The campaign map: the Training Grounds and the Kingdom, each level's stars and crown, and which are unlocked.
export function openMap(): void
{
	stopRun(true);
	const body = $("#mapbody");
	body.innerHTML = "";
	const chapters = [
		{
			t: "Training Grounds",
			p: "Learn the spells and meet every kind of knight. Levels marked NEW let you try a new block, and beating them makes it yours. Replay any level with everything you have unlocked to chase its crown.",
			from: 0,
			to: NT,
		},
		{
			t: "The Kingdom",
			p: "Generated battles that grow harder as more knights join the fight. Every one has been checked to be winnable.",
			from: NT,
			to: LEVELS.length,
		},
	];
	let total = 0,
		crowns = 0;
	chapters.forEach((ch) =>
	{
		const sec = el("section", "chapter page");
		sec.appendChild(el("h3", null, ch.t));
		sec.appendChild(el("p", null, ch.p));
		const grid = el("div", "lvgrid");
		for (let i = ch.from; i < ch.to; i++)
		{
			const L = LEVELS[i]!;
			const nm = L.name!,
				prev = i > 0 ? LEVELS[i - 1]!.name! : null;
			const unlocked =
				i === 0 || (prev !== null && (progress.stars[prev] ?? 0) > 0) || (progress.stars[nm] ?? 0) > 0;
			const st = progress.stars[nm] ?? 0;
			total += st;
			const cr = !!progress.crowns[nm];
			if (cr) crowns++;
			const b = el("button", `lv${unlocked ? "" : " locked"}`);
			b.disabled = !unlocked;
			b.appendChild(el("span", "num", String(i + 1)));
			b.appendChild(el("span", "nm", nm));
			if (L.newBlocks?.length && i > 0)
				b.appendChild(el("span", "newlv", `NEW: ${L.newBlocks.map((t) => BDEF[t].label).join(", ")}`));
			b.appendChild(
				el("span", "st", unlocked ? "★".repeat(st) + "☆".repeat(3 - st) + (cr ? "  ♛" : "") : "Locked"),
			);
			if (unlocked && !cr && L.crown && st > 0) b.appendChild(el("span", "cg", `♛ goal: ${L.crown} blocks`));
			b.addEventListener("click", (): void =>
			{
				playCampaign(i);
			});
			grid.appendChild(b);
		}
		sec.appendChild(grid);
		body.appendChild(sec);
	});
	$("#map-stars").textContent =
		`★ ${total} / ${LEVELS.length * 3}   ♛ ${crowns} / ${LEVELS.length}   Blocks: ${unlockedBlocks().size} / ${ALL_BLOCKS.length}`;
	show("map");
}
export function playCampaign(i: number): void
{
	const L = LEVELS[i]!;
	startLevel(
		L,
		{
			mode: "campaign",
			index: i,
			key: `c${i}`,
			title: `${i + 1}. ${L.name}`,
			attempts: 0,
		},
	);
}
