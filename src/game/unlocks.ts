import type {BlockType} from "./engine.ts";
import {TUTORIAL} from "./levels/tutorial.ts";
import {play} from "./state.ts";
import {progress} from "./store.ts";

export const ALL_BLOCKS: BlockType[] = [
	"move",
	"fly",
	"takeoff",
	"land",
	"left",
	"right",
	"around",
	"attack",
	"whip",
	"fireball",
	"firespin",
	"gust",
	"roar",
	"curl",
	"wait",
	"repeat",
	"until",
	"forever",
	"if",
	"set",
	"change",
	"define",
	"cast",
];
/* block unlocks: you can try a level's new blocks while playing it, and they become yours once you beat it */
export function unlockedBlocks(): Set<BlockType>
{
	const set = new Set(TUTORIAL[0]!.newBlocks);
	TUTORIAL.forEach((L) =>
	{
		if ((progress.stars[L.name!] ?? 0) > 0) (L.newBlocks ?? []).forEach((b) => set.add(b));
	});
	if (TUTORIAL.every((L) => (progress.stars[L.name!] ?? 0) > 0)) ALL_BLOCKS.forEach((b) => set.add(b));
	return set;
}
export function paletteBlocks(): BlockType[]
{
	const newBlocks = play.level?.newBlocks;
	if (play.ctx?.mode !== "campaign" || !newBlocks) return ALL_BLOCKS;
	const set = unlockedBlocks();
	newBlocks.forEach((b) => set.add(b));
	return ALL_BLOCKS.filter((b) => set.has(b));
}
export function isNewHere(t: BlockType): boolean
{
	return play.ctx?.mode === "campaign" && !!play.level?.newBlocks?.includes(t) && !unlockedBlocks().has(t);
}
