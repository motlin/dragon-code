import {sanitizeLevel} from "../shared/level.ts";
import {db, dbInit, withTimeout} from "./db.ts";
import {$, $as, context2d, el, later} from "./dom.ts";
import {boardCell, drawBoard, drawDragon, drawKnight, drawTile} from "./draw.ts";
import {type BoardState, type Facing, KTYPES, type KnightSpec, type KnightType, type Level} from "./engine.ts";
import {KINFO, OPS, opLabel} from "./knights.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {startLevel, stopRun} from "./run.ts";
import {show} from "./screens.ts";
import {solveInWorker, stripLevel} from "./solver.ts";
import {hooks} from "./state.ts";
import {prefs, store} from "./store.ts";

// The Level Forge: paint a board, place the dragon and knights, write each knight's code, test it, and publish it
// once you have beaten it yourself. The level being forged is saved as dc_draft.

interface Draft
{
	name: string;
	w: number;
	h: number;
	map: string[];
	dragon: Facing | null;
	knights: KnightSpec[];
	beaten: boolean;
}
type Tool = "." | "#" | "~" | "T" | "t" | "dragon" | KnightType | "erase";
const editor:
{
	tool: Tool;
	sel: number;
	painting: boolean;
	draft: Draft | null;
} =
{
	tool: "#",
	sel: -1,
	painting: false,
	draft: null,
};
const draftOf = (): Draft => editor.draft!;
function blankDraft(w: number, h: number): Draft
{
	const map: string[] = [];
	for (let y = 0; y < h; y++) map.push(".".repeat(w));
	return {
		name: "",
		w,
		h,
		map,
		dragon:
		{
			x: 0,
			y: Math.floor(h / 2),
			d: 1,
		},
		knights: [],
		beaten: false,
	};
}
function saveDraft(): void
{
	store.set("dc_draft", editor.draft);
}
export function markDraftBeaten(): void
{
	draftOf().beaten = true;
	saveDraft();
}
function loadDraft(): Draft | null
{
	const d = store.get<Record<string, unknown> | null>("dc_draft", null);
	if (!d) return null;
	const knights = d["knights"];
	const hasK = Array.isArray(knights) && knights.length > 0;
	const s = sanitizeLevel(
		{
			...d,
			dragon: d["dragon"] ??
			{
				x: 0,
				y: 0,
				d: 1,
			},
			knights: hasK
				? knights
				: [
						{
							type: "soldier",
							x: 0,
							y: 0,
							d: 0,
							prog: "W",
						},
					],
		},
	);
	if (!s) return null;
	return {
		name: typeof d["name"] === "string" ? d["name"] : "",
		beaten: !!d["beaten"],
		w: s.w,
		h: s.h,
		map: s.map,
		dragon: d["dragon"] ? s.dragon : null,
		knights: hasK ? s.knights : [],
	};
}
const TOOLS: [Tool, string][] = [
	[".", "Grass"],
	["#", "Wall"],
	["~", "Water"],
	["T", "Tree"],
	["t", "Taco"],
	["dragon", "Dragon"],
	["soldier", "Soldier"],
	["shield", "Shield"],
	["archer", "Archer"],
	["rider", "Rider"],
	["spearman", "Spearman"],
	["paladin", "Paladin"],
	["erase", "Eraser"],
];
const isTileTool = (t: Tool): t is "." | "#" | "~" | "T" | "t" => [".", "#", "~", "T", "t"].includes(t);
export function openEditor(): void
{
	stopRun(true);
	editor.draft ??=
		loadDraft() ??
		((): Draft =>
		{
			const d = blankDraft(7, 6);
			d.knights.push(
				{
					type: "soldier",
					x: 5,
					y: 3,
					d: 3,
					prog: "FFU",
				},
			);
			return d;
		})();
	const tl = $("#tools");
	tl.innerHTML = "";
	TOOLS.forEach(([id, label]) =>
	{
		const b = el("button", `tool${editor.tool === id ? " on" : ""}`);
		b.type = "button";
		const cv = el("canvas");
		cv.width = 68;
		cv.height = 68;
		b.appendChild(cv);
		b.appendChild(el("span", null, label));
		b.addEventListener("click", (): void =>
		{
			editor.tool = id;
			tl.querySelectorAll(".tool").forEach((x) =>
			{
				x.classList.remove("on");
			});
			b.classList.add("on");
		});
		tl.appendChild(b);
		const g = context2d(cv);
		if (isTileTool(id)) drawTile(g, id, 0, 0, 68, 0, 0, 0);
		else if (id === "dragon")
		{
			drawTile(g, ".", 0, 0, 68, 1, 1, 0);
			drawDragon(g, 34, 36, 68, 0, 0, 0);
		}
		else if (id === "erase")
		{
			g.fillStyle = "#f1e4c3";
			g.fillRect(0, 0, 68, 68);
			g.strokeStyle = "#c4432a";
			g.lineWidth = 6;
			g.beginPath();
			g.moveTo(16, 16);
			g.lineTo(52, 52);
			g.moveTo(52, 16);
			g.lineTo(16, 52);
			g.stroke();
		}
		else
		{
			drawTile(g, ".", 0, 0, 68, 2, 2, 0);
			drawKnight(g, 34, 34, 64, id, Math.PI / 2, 1);
		}
	});
	const d = draftOf();
	$as("#ed-name", HTMLInputElement).value = d.name;
	$as("#ed-w", HTMLSelectElement).value = String(d.w);
	$as("#ed-h", HTMLSelectElement).value = String(d.h);
	renderEdSide();
	show("editor");
}
function edChanged(): void
{
	draftOf().beaten = false;
	saveDraft();
	renderEdSide();
}
function setTileD(x: number, y: number, c: string): void
{
	const d = draftOf();
	const r = d.map[y]!;
	d.map[y] = r.slice(0, x) + c + r.slice(x + 1);
}
function edKnightAt(x: number, y: number): number
{
	return draftOf().knights.findIndex((k) => k.x === x && k.y === y);
}
const blocked = (ch: string): boolean => ch === "#" || ch === "~" || ch === "T";
function edApply(x: number, y: number, first: boolean): void
{
	const d = draftOf(),
		t = editor.tool,
		c = d.map[y]![x]!,
		ki = edKnightAt(x, y),
		dragon = d.dragon,
		isDragon = !!dragon && dragon.x === x && dragon.y === y;
	if (isTileTool(t))
	{
		if ((ki >= 0 || isDragon) && blocked(t)) return;
		if (isDragon && t === "t") return;
		if (c !== t)
		{
			setTileD(x, y, t);
			edChanged();
		}
		return;
	}
	if (!first) return;
	if (t === "erase")
	{
		if (ki >= 0)
		{
			d.knights.splice(ki, 1);
			editor.sel = -1;
		}
		else if (isDragon) d.dragon = null;
		else setTileD(x, y, ".");
		edChanged();
		return;
	}
	if (t === "dragon")
	{
		if (dragon && isDragon) dragon.d = (dragon.d + 1) % 4;
		else
		{
			if (blocked(c) || c === "t" || ki >= 0) return;
			d.dragon =
			{
				x,
				y,
				d: dragon ? dragon.d : 1,
			};
		}
		edChanged();
		return;
	}
	// knight tools
	if (ki >= 0)
	{
		if (editor.sel === ki) d.knights[ki]!.d = (d.knights[ki]!.d + 1) % 4;
		editor.sel = ki;
		edChanged();
		return;
	}
	if (blocked(c) || isDragon) return;
	if (d.knights.length >= 12)
	{
		edStatus("That is plenty of knights! (12 max)");
		return;
	}
	d.knights.push(
		{
			type: t,
			x,
			y,
			d: 3,
			prog: t === "archer" ? "A" : "W",
		},
	);
	editor.sel = d.knights.length - 1;
	edChanged();
}
function edStatus(msg: string): void
{
	$("#ed-msg").textContent = msg;
}
const OP_COLORS: Record<string, string> =
{
	F: "#4f8a3a",
	L: "#b8791f",
	R: "#b8791f",
	U: "#b8791f",
	A: "#c4432a",
	W: "#857a68",
	G: "#c86624",
	T: "#7a4f9a",
	C: "#5b3a8a",
};
function renderEdSide(): void
{
	const d = draftOf(),
		side = $("#ed-knight");
	side.innerHTML = "";
	if (editor.sel >= d.knights.length) editor.sel = -1;
	if (editor.sel < 0)
		side.appendChild(
			el(
				"p",
				"ed-status",
				"Click a knight on the board to edit its code. Click it again to turn it. Click the dragon with the Dragon tool to turn it.",
			),
		);
	else
	{
		const k = d.knights[editor.sel]!;
		side.appendChild(el("h3", null, `Knight ${editor.sel + 1}`));
		const tf = el("div", "field");
		tf.appendChild(el("span", null, "Type"));
		const ts = el("select");
		ts.id = "ed-ktype";
		KTYPES.forEach((t) =>
		{
			const o = el("option", null, KINFO[t].name);
			o.value = t;
			ts.appendChild(o);
		});
		ts.value = k.type;
		ts.addEventListener("change", (): void =>
		{
			k.type = KTYPES.find((t) => t === ts.value)!;
			edChanged();
		});
		tf.appendChild(ts);
		side.appendChild(tf);
		const df = el("div", "field");
		df.appendChild(el("span", null, "Facing"));
		const dirs = el("div", "dirbtns");
		["North", "East", "South", "West"].forEach((n, i) =>
		{
			const b = el("button", `btn small${k.d === i ? " fire" : ""}`, n);
			b.addEventListener("click", (): void =>
			{
				k.d = i;
				edChanged();
			});
			dirs.appendChild(b);
		});
		df.appendChild(dirs);
		side.appendChild(df);
		const pf = el("div", "field");
		pf.appendChild(el("span", null, "Code (loops forever)"));
		const kp = el("div", "kprog");
		k.prog.split("").forEach((op, j) =>
		{
			const ch = el("span", `kchip ${op}`, opLabel(op, k.type));
			const x = el("button", null, "×");
			x.setAttribute("aria-label", "Remove");
			x.addEventListener("click", (): void =>
			{
				if (k.prog.length <= 1)
				{
					edStatus("A knight needs at least one line of code.");
					return;
				}
				k.prog = k.prog.slice(0, j) + k.prog.slice(j + 1);
				edChanged();
			});
			ch.appendChild(x);
			kp.appendChild(ch);
		});
		pf.appendChild(kp);
		side.appendChild(pf);
		const ob = el("div", "opbtns");
		OPS.forEach((op) =>
		{
			const b = el("button", null, `+ ${opLabel(op, k.type)}`);
			b.style.background = OP_COLORS[op]!;
			b.addEventListener("click", (): void =>
			{
				if (k.prog.length >= 12)
				{
					edStatus("12 lines max.");
					return;
				}
				k.prog += op;
				edChanged();
			});
			ob.appendChild(b);
		});
		side.appendChild(ob);
		const rm = el("div", "row");
		rm.style.display = "flex";
		rm.style.gap = "6px";
		const cl = el("button", "btn small", "Clear code");
		cl.addEventListener("click", (): void =>
		{
			k.prog = "W";
			edChanged();
		});
		rm.appendChild(cl);
		const del = el("button", "btn small ghost", "Remove knight");
		del.addEventListener("click", (): void =>
		{
			d.knights.splice(editor.sel, 1);
			editor.sel = -1;
			edChanged();
		});
		rm.appendChild(del);
		side.appendChild(rm);
	}
	const ok = edValid();
	$as("#ed-test", HTMLButtonElement).disabled = !!ok;
	$as("#ed-publish", HTMLButtonElement).disabled = !!ok || !d.beaten;
	const m = $("#ed-msg");
	m.innerHTML = "";
	if (ok) m.textContent = ok;
	else if (d.beaten)
	{
		m.appendChild(el("b", null, "Ready! "));
		m.appendChild(document.createTextNode("You beat it. Publish it to the gallery."));
	}
	else
	{
		m.appendChild(el("b", null, "Next: "));
		m.appendChild(document.createTextNode("test your level and beat it yourself to unlock publishing."));
	}
}
function edValid(): string
{
	const d = draftOf();
	if (!d.dragon) return "Place your dragon with the Dragon tool.";
	if (!d.knights.length) return "Add at least one knight.";
	return "";
}
function draftLevel(): Level
{
	const d = draftOf();
	return {
		name: d.name || "My level",
		w: d.w,
		h: d.h,
		map: d.map.slice(),
		dragon:
		{
			...d.dragon!,
		},
		knights: structuredClone(d.knights),
	};
}
export function drawEditor(now: number): void
{
	const cv = $as("#ed-board", HTMLCanvasElement);
	const d = editor.draft;
	if (!d) return;
	const S: BoardState =
	{
		w: d.w,
		h: d.h,
		tiles: d.map.join("").split(""),
		dragon: d.dragon
			?
				{
					x: d.dragon.x,
					y: d.dragon.y,
					d: d.dragon.d,
					fly: false,
					hp: 3,
					charged: false,
					spun: false,
					curl: false,
					ammo: 2,
				}
			: null,
		knights: d.knights.map((k, i) => (
		{
			id: i,
			type: k.type,
			x: k.x,
			y: k.y,
			d: k.d,
			prog: [],
			pc: 0,
			alive: true,
			hp: 2,
			shield: true,
			stun: 0,
		})),
		balls: [],
	};
	drawBoard(
		cv,
		S,
		S,
		1,
		now,
		{
			noShake: true,
			selected: editor.sel,
		},
	);
}
function resizeDraft(w: number, h: number): void
{
	const d = draftOf();
	const map: string[] = [];
	for (let y = 0; y < h; y++)
	{
		let r = "";
		for (let x = 0; x < w; x++) r += y < d.h && x < d.w ? d.map[y]![x]! : ".";
		map.push(r);
	}
	d.map = map;
	d.w = w;
	d.h = h;
	d.knights = d.knights.filter((k) => k.x < w && k.y < h);
	if (d.dragon && (d.dragon.x >= w || d.dragon.y >= h)) d.dragon = null;
	editor.sel = -1;
	edChanged();
}
function publishResult(title: string, text: string): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, title));
		c.appendChild(el("p", null, text));
		const r = el("div", "row");
		mBtn(r, "OK", "fire", closeModal);
		c.appendChild(r);
	});
}
async function publishDraft(): Promise<void>
{
	await dbInit;
	const d = draftOf();
	const name = d.name.trim();
	if (!name)
	{
		edStatus("Give your level a name first.");
		$("#ed-name").focus();
		return;
	}
	const {DB, MYID} = db;
	if (!DB || !MYID)
	{
		publishResult("Can't publish here", "Publishing needs you to be signed in to Claude while viewing this game.");
		return;
	}
	modal((c) =>
	{
		c.appendChild(el("h2", null, "Publishing..."));
	});
	try
	{
		const ref = DB.doc(`levels/${MYID}`);
		const s = await withTimeout(ref.get(), 10000);
		const v = s.exists
			?
				{
					...s.data(),
				}
			: {};
		const stored: unknown = v["levels"];
		const levels: unknown[] = (Array.isArray(stored) ? stored : []).slice(-29);
		const {name: _name, ...lv} = draftLevel();
		levels.push(
			{
				id: `L${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
				name: name.slice(0, 40),
				created: Date.now(),
				data: lv,
			},
		);
		await withTimeout(
			ref.set(
				{
					nick: prefs.nick.slice(0, 24),
					levels,
				},
			),
			10000,
		);
		d.beaten = false;
		saveDraft();
		renderEdSide();
		modal((c) =>
		{
			c.appendChild(el("h2", null, "Published!"));
			c.appendChild(el("p", null, `"${name}" is now in the gallery.`));
			const r = el("div", "row");
			mBtn(r, "See the gallery", "fire", async () =>
			{
				closeModal();
				await hooks.openGallery();
			});
			mBtn(r, "Keep forging", "", closeModal);
			c.appendChild(r);
		});
	}
	catch
	{
		publishResult(
			"Could not publish",
			"Your access to this game may be view-only. Ask the game's owner to give you Contributor access, then try again.",
		);
	}
}
function stopPainting(): void
{
	editor.painting = false;
}
export function initEditor(): void
{
	const cv = $as("#ed-board", HTMLCanvasElement);
	cv.addEventListener("pointerdown", (e) =>
	{
		const c = boardCell(cv, e, draftOf());
		if (!c) return;
		editor.painting = true;
		cv.setPointerCapture(e.pointerId);
		edApply(c.x, c.y, true);
	});
	cv.addEventListener("pointermove", (e) =>
	{
		if (!editor.painting) return;
		const c = boardCell(cv, e, draftOf());
		if (c) edApply(c.x, c.y, false);
	});
	cv.addEventListener("pointerup", stopPainting);
	cv.addEventListener("pointercancel", stopPainting);
	const ew = $as("#ed-w", HTMLSelectElement),
		eh = $as("#ed-h", HTMLSelectElement),
		en = $as("#ed-name", HTMLInputElement);
	for (let i = 5; i <= 10; i++)
	{
		const o = el("option", null, String(i));
		o.value = String(i);
		ew.appendChild(o);
	}
	for (let i = 4; i <= 9; i++)
	{
		const o = el("option", null, String(i));
		o.value = String(i);
		eh.appendChild(o);
	}
	ew.addEventListener("change", (): void =>
	{
		resizeDraft(Number(ew.value), draftOf().h);
	});
	eh.addEventListener("change", (): void =>
	{
		resizeDraft(draftOf().w, Number(eh.value));
	});
	en.addEventListener("input", (): void =>
	{
		draftOf().name = en.value.slice(0, 40);
		saveDraft();
	});
	$("#ed-test").addEventListener("click", (): void =>
	{
		const L = draftLevel();
		startLevel(
			L,
			{
				mode: "test",
				key: "test",
				title: `Testing: ${L.name}`,
				attempts: 0,
			},
		);
	});
	$("#ed-publish").addEventListener("click", later(publishDraft));
	$("#ed-new").addEventListener("click", (): void =>
	{
		modal((c) =>
		{
			c.appendChild(el("h2", null, "Start a new level?"));
			c.appendChild(el("p", null, "This clears the board you are working on."));
			const r = el("div", "row");
			mBtn(r, "Clear it", "fire", () =>
			{
				editor.draft = blankDraft(draftOf().w, draftOf().h);
				editor.sel = -1;
				saveDraft();
				closeModal();
				openEditor();
			});
			mBtn(r, "Cancel", "", closeModal);
			c.appendChild(r);
		});
	});
	$("#ed-wizard").addEventListener(
		"click",
		later(async (): Promise<void> =>
		{
			const v = edValid();
			if (v)
			{
				edStatus(v);
				return;
			}
			edStatus("The wizard is studying your level...");
			const sol = await solveInWorker(stripLevel(draftLevel()), 80000);
			if (sol) edStatus(`The wizard found a way to win in ${sol.length} steps. Now beat it yourself!`);
			else edStatus("The wizard could not find a way to win. It might be impossible, or just very tricky.");
		}),
	);
	$("#ed-back").addEventListener("click", (): void =>
	{
		show("home");
	});
}
