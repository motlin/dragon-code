import {type KnightSpec, KTYPES, type Level} from "../game/engine.ts";

// The checks every level from outside the game goes through, in the gallery, the saved forge draft and the Worker's
// publish endpoint: a board from 3 by 3 to 12 by 12 of known tiles, a dragon on it, and 1 to 20 knights of known
// types on it, each with 1 to 16 lines of knight code. Numbers are truncated to integers and directions wrapped to
// 0..3, as the artifact did. Anything else is refused with null.
const VALID_T = /^[.#~Tt,]+$/,
	VALID_P = /^[FLRUAWGTC]{1,16}$/;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
// ToInt32, as `value|0` did in the artifact.
const int = (value: unknown): number => Number(value) | 0;
const isKnightType = (value: unknown): value is KnightSpec["type"] => KTYPES.some((type) => type === value);

export function sanitizeLevel(L: unknown): Level | null
{
	if (!isRecord(L)) return null;
	const w = int(L["w"]),
		h = int(L["h"]);
	if (w < 3 || h < 3 || w > 12 || h > 12) return null;
	const rows = L["map"];
	if (!Array.isArray(rows) || rows.length !== h) return null;
	const map = rows.map((r) => String(r));
	if (map.some((r) => r.length !== w || !VALID_T.test(r))) return null;
	const dr = L["dragon"];
	if (!isRecord(dr)) return null;
	const dragon =
	{
		x: int(dr["x"]),
		y: int(dr["y"]),
		d: int(dr["d"]) & 3,
	};
	if (dragon.x < 0 || dragon.y < 0 || dragon.x >= w || dragon.y >= h) return null;
	const list = L["knights"];
	if (!Array.isArray(list) || !list.length || list.length > 20) return null;
	const knights: KnightSpec[] = [];
	for (const k of list)
	{
		if (!isRecord(k) || !isKnightType(k["type"])) return null;
		const kk: KnightSpec =
		{
			type: k["type"],
			x: int(k["x"]),
			y: int(k["y"]),
			d: int(k["d"]) & 3,
			prog: String(k["prog"]),
		};
		if (!VALID_P.test(kk.prog) || kk.x < 0 || kk.y < 0 || kk.x >= w || kk.y >= h) return null;
		knights.push(kk);
	}
	return {
		w,
		h,
		map,
		dragon,
		knights,
	};
}
