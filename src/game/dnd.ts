import {BDEF, findBlock, getList, getPath, newBlock, renderWS, saveProg, setPath} from "./blocks.ts";
import {$, $$, closest, el} from "./dom.ts";
import {type Block, BLOCK_TYPES, type BlockType, type Oval} from "./engine.ts";
import {sfx} from "./sound.ts";
import {play} from "./state.ts";

// Dragging blocks from the palette into the spell, around it and out of it to delete them, and dragging ovals into
// number boxes. A tap on a palette block adds it to the end.

interface DragSource
{
	id?: string;
	type?: BlockType;
	val?: Oval;
}
interface Drag
{
	src: DragSource;
	srcEl: HTMLElement;
	rect: DOMRect;
	clone: HTMLElement;
	x0: number;
	y0: number;
	started: boolean;
	target:
	{
		owner: string;
		slot: string;
		before: string | null;
	} | null;
	slotTarget:
	{
		id: string;
		path: string;
	} | null;
	overWs: boolean;
	offX: number;
	offY: number;
	ghost: HTMLElement | null;
}
let drag: Drag | null = null;
function dragStart(e: PointerEvent, src: DragSource, srcEl: HTMLElement): void
{
	if (play.running) return;
	if (e.button !== 0) return;
	const rect = srcEl.getBoundingClientRect();
	const clone = srcEl.cloneNode(true);
	if (!(clone instanceof HTMLElement)) return;
	drag =
	{
		src,
		srcEl,
		rect,
		clone,
		x0: e.clientX,
		y0: e.clientY,
		started: false,
		target: null,
		slotTarget: null,
		overWs: false,
		offX: 0,
		offY: 0,
		ghost: null,
	};
	window.addEventListener("pointermove", dragMove);
	window.addEventListener("pointerup", dragEnd);
	window.addEventListener("pointercancel", dragCancel);
}
function dragMove(e: PointerEvent): void
{
	if (!drag) return;
	if (!drag.started)
	{
		if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
		drag.started = true;
		const g = drag.clone;
		g.classList.add("dragghost");
		g.classList.remove("running");
		const r = drag.rect;
		drag.offX = Math.min(r.width, Math.max(0, drag.x0 - r.left)) || 10;
		drag.offY = Math.min(r.height, Math.max(0, drag.y0 - r.top)) || 10;
		if (r.width) g.style.width = `${r.width}px`;
		document.body.appendChild(g);
		drag.ghost = g;
		if (drag.src.id) drag.srcEl.classList.add("dragging");
	}
	e.preventDefault();
	drag.ghost!.style.left = `${e.clientX - drag.offX}px`;
	drag.ghost!.style.top = `${e.clientY - drag.offY}px`;
	const ws = $("#ws");
	const wr = ws.getBoundingClientRect();
	const inWs = e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom;
	drag.overWs = inWs;
	ws.classList.toggle("trash-over", !inWs && !!drag.src.id);
	$$(".dropline").forEach((n) =>
	{
		n.remove();
	});
	drag.target = null;
	if (!inWs) return;
	if (e.clientY < wr.top + 30) ws.scrollTop -= 10;
	else if (e.clientY > wr.bottom - 30) ws.scrollTop += 10;
	const hit = document.elementFromPoint(e.clientX, e.clientY);
	if (drag.src.val)
	{
		$$(".slot.hover").forEach((n) =>
		{
			n.classList.remove("hover");
		});
		const sl = hit ? hit.closest<HTMLElement>(".slot") : null;
		if (sl && ws.contains(sl))
		{
			sl.classList.add("hover");
			drag.slotTarget =
			{
				id: sl.closest<HTMLElement>(".blk")!.dataset["id"]!,
				path: sl.dataset["path"]!,
			};
		}
		else drag.slotTarget = null;
		return;
	}
	let list = hit ? hit.closest<HTMLElement>(".blist") : null;
	if (!list || !ws.contains(list)) list = ws.querySelector<HTMLElement>(".rootlist")!;
	if (drag.src.id && drag.srcEl.contains(list)) return; // can't drop into itself
	const srcEl = drag.srcEl;
	const kids = [...list.children].filter(
		(c): c is HTMLElement => c instanceof HTMLElement && c.classList.contains("blk") && c !== srcEl,
	);
	let idx = kids.length;
	for (let i = 0; i < kids.length; i++)
	{
		const r = kids[i]!.getBoundingClientRect();
		if (e.clientY < r.top + r.height / 2)
		{
			idx = i;
			break;
		}
	}
	const line = el("div", "dropline");
	if (idx < kids.length) list.insertBefore(line, kids[idx]!);
	else list.appendChild(line);
	drag.target =
	{
		owner: list.dataset["owner"]!,
		slot: list.dataset["slot"]!,
		before: idx < kids.length ? kids[idx]!.dataset["id"]! : null,
	};
}
function dragCleanup(): void
{
	window.removeEventListener("pointermove", dragMove);
	window.removeEventListener("pointerup", dragEnd);
	window.removeEventListener("pointercancel", dragCancel);
	drag?.ghost?.remove();
	$$(".dropline").forEach((n) =>
	{
		n.remove();
	});
	$("#ws").classList.remove("trash-over");
	$$(".slot.hover").forEach((n) =>
	{
		n.classList.remove("hover");
	});
	drag?.srcEl.classList.remove("dragging");
}
function dragCancel(): void
{
	dragCleanup();
	drag = null;
}
function dragEnd(): void
{
	if (!drag) return;
	const d = drag;
	dragCleanup();
	drag = null;
	if (d.src.val)
	{
		if (d.started && d.slotTarget)
		{
			const f = findBlock(d.slotTarget.id);
			if (f)
			{
				setPath(f.block, d.slotTarget.path, structuredClone(d.src.val));
				sfx("click");
			}
		}
		renderWS();
		saveProg();
		return;
	}
	if (!d.started)
	{
		if (d.src.type)
		{
			play.prog.push(newBlock(d.src.type));
			renderWS();
			saveProg();
			sfx("click");
			const ws = $("#ws");
			ws.scrollTop = ws.scrollHeight;
		}
		return;
	}
	let block: Block;
	if (d.src.id)
	{
		const f = findBlock(d.src.id);
		if (!f) return;
		if (!d.target)
		{
			if (!d.overWs)
			{
				f.list.splice(f.index, 1);
				renderWS();
				saveProg();
			}
			return;
		}
		block = f.block;
		f.list.splice(f.index, 1);
	}
	else
	{
		if (!d.target) return;
		block = newBlock(d.src.type!);
	}
	const list = getList(d.target.owner, d.target.slot);
	if (!list)
	{
		renderWS();
		return;
	}
	let at = list.length;
	const before = d.target.before;
	if (before)
	{
		const i = list.findIndex((b) => b.id === before);
		if (i >= 0) at = i;
	}
	list.splice(at, 0, block);
	sfx("click");
	renderWS();
	saveProg();
}
// Reads an oval from a palette chip's data-val, which renderPalette wrote.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the palette wrote it from an Oval
const ovalOf = (chip: HTMLElement): Oval => JSON.parse(chip.dataset["val"]!) as Oval;
export function initDnD(): void
{
	$("#palette").addEventListener("pointerdown", (e) =>
	{
		if (closest(e, "button")) return;
		const rc = closest(e, ".rchip");
		if (rc)
		{
			e.preventDefault();
			dragStart(
				e,
				{
					val: ovalOf(rc),
				},
				rc,
			);
			return;
		}
		const b = closest(e, ".blk");
		if (!b) return;
		e.preventDefault();
		dragStart(
			e,
			{
				type: BLOCK_TYPES.find((t) => t === b.dataset["palette"])!,
			},
			b,
		);
	});
	$("#ws").addEventListener("pointerdown", (e) =>
	{
		if (closest(e, "select,button,input")) return;
		const rc = closest(e, ".rchip");
		if (rc?.parentElement?.classList.contains("slot"))
		{
			e.preventDefault();
			const sl = rc.parentElement;
			const f = findBlock(rc.closest<HTMLElement>(".blk")!.dataset["id"]!);
			if (f)
			{
				const path = sl.dataset["path"]!;
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an oval chip sits in a slot whose value is that oval
				const val = structuredClone(getPath(f.block, path)) as Oval;
				dragStart(
					e,
					{
						val,
					},
					rc,
				);
				let def = 0;
				if (path === "n")
				{
					const d = BDEF[f.block.type];
					def = f.block.type === "set" || f.block.type === "change" ? 1 : d.num ? Math.max(1, d.num[0]) : 1;
				}
				setPath(f.block, path, def);
			}
			renderWS();
			saveProg();
			return;
		}
		const b = closest(e, ".blk");
		if (!b || b.classList.contains("hat")) return;
		e.preventDefault();
		dragStart(
			e,
			{
				id: b.dataset["id"]!,
			},
			b,
		);
	});
}
