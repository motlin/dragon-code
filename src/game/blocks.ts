import {$, el} from "./dom.ts";
import
{
	type Block,
	type BlockType,
	type CompareOp,
	type Cond,
	CONDS,
	countBlocks,
	type MathOp,
	type NumberValue,
	type Oval,
	type Sensor,
	SENSORS,
} from "./engine.ts";
import {updateCrown} from "./hud.ts";
import {svgIcon} from "./icons.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {play, progCache} from "./state.ts";
import {prefs, store} from "./store.ts";
import {isNewHere, paletteBlocks} from "./unlocks.ts";

// The spellbook: what each block looks like and holds, the palette to drag them from, and the spell being written.

interface BlockDef
{
	label: string;
	cls: string;
	num?: [number, number];
	tip?: string;
	spellsel?: boolean;
	body?: boolean;
	cap?: boolean;
	suffix?: string;
	cond?: boolean;
	els?: boolean;
	hat?: boolean;
	varsel?: boolean;
	mid?: string;
}
export const BDEF: Record<BlockType, BlockDef> =
{
	move:
	{
		label: "Move forward",
		num: [1, 20],
		cls: "c-move",
	},
	fly:
	{
		label: "Fly forward",
		num: [1, 20],
		cls: "c-fly",
	},
	takeoff:
	{
		label: "Take off",
		cls: "c-air",
	},
	land:
	{
		label: "Land",
		cls: "c-air",
	},
	left:
	{
		label: "Turn left",
		cls: "c-turn",
	},
	right:
	{
		label: "Turn right",
		cls: "c-turn",
	},
	around:
	{
		label: "Turn around",
		cls: "c-turn",
	},
	attack:
	{
		label: "Breathe fire",
		cls: "c-fire",
	},
	firespin:
	{
		label: "Fire spin",
		cls: "c-fire",
		tip: "2 steps",
	},
	gust:
	{
		label: "Wing gust",
		cls: "c-power",
	},
	roar:
	{
		label: "Roar",
		cls: "c-power",
	},
	curl:
	{
		label: "Curl up",
		cls: "c-power",
	},
	define:
	{
		label: "Define spell",
		spellsel: true,
		cls: "c-spell",
		body: true,
		cap: true,
	},
	cast:
	{
		label: "Cast",
		spellsel: true,
		cls: "c-spell",
	},
	whip:
	{
		label: "Tail whip",
		cls: "c-whip",
	},
	fireball:
	{
		label: "Fireball",
		cls: "c-fire",
		tip: "2 per level",
	},
	wait:
	{
		label: "Wait",
		cls: "c-wait",
	},
	repeat:
	{
		label: "Repeat",
		num: [2, 20],
		suffix: "times",
		cls: "c-loop",
		body: true,
	},
	until:
	{
		label: "Repeat until",
		cond: true,
		cls: "c-loop",
		body: true,
	},
	forever:
	{
		label: "Repeat forever",
		cls: "c-loop",
		body: true,
		cap: true,
	},
	if:
	{
		label: "If",
		cond: true,
		cls: "c-if",
		body: true,
		els: true,
	},
	start:
	{
		label: "When spell run",
		cls: "c-start",
		hat: true,
	},
	set:
	{
		label: "Set",
		varsel: true,
		mid: "to",
		num: [-99, 99],
		cls: "c-var",
	},
	change:
	{
		label: "Change",
		varsel: true,
		mid: "by",
		num: [-99, 99],
		cls: "c-var",
	},
};
const SENSOR_LABEL: Record<Sensor, string> =
{
	wall: "distance to wall",
	knights: "knights left",
	hearts: "hearts",
	fireballs: "fireballs left",
	kdist: "knight distance",
};
const storedVars = store.get<unknown>("dc_vars", []);
let VARS: string[] = Array.isArray(storedVars) ? storedVars.map(String) : [];
const saveVars = (): void =>
{
	store.set("dc_vars", VARS);
};
const refLabel = (r: Oval): string => r.v ?? (r.s ? SENSOR_LABEL[r.s] : "");
const refStr = (r: Oval): string => (r.v === undefined ? `s:${r.s}` : `v:${r.v}`);
const isSensor = (s: string): s is Sensor => SENSORS.some((x) => x === s);
const parseRef = (str: string): Oval =>
{
	const rest = str.slice(2);
	if (str.startsWith("v:"))
		return {
			v: rest,
		};
	if (!isSensor(rest)) throw new Error(`${rest} is not a sensor`);
	return {
		s: rest,
	};
};
function valVars(x: NumberValue | undefined, set: Set<string>): void
{
	if (x === undefined || typeof x !== "object") return;
	if (x.v !== undefined) set.add(x.v);
	if (x.op)
	{
		valVars(x.a, set);
		valVars(x.b, set);
	}
}
function collectVars(list: Block[], set = new Set<string>()): Set<string>
{
	for (const b of list)
	{
		if (b.v && (b.type === "set" || b.type === "change")) set.add(b.v);
		valVars(b.n, set);
		valVars(b.cn, set);
		valVars(b.cv, set);
		if (b.body) collectVars(b.body, set);
		if (b.else) collectVars(b.else, set);
	}
	return set;
}
const OPSYM: Record<MathOp, string> =
{
	"+": "+",
	"-": "−",
	"*": "×",
	"/": "÷",
	"%": "mod",
	abs: "abs",
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
// The value at a dotted path in a block, such as n or n.a.b for a box inside a math oval.
export const getPath = (o: Block, path: string): unknown =>
	path.split(".").reduce<unknown>((a, k) => (isRecord(a) ? a[k] : undefined), o);
export function setPath(o: Block, path: string, v: unknown): void
{
	const ks = path.split(".");
	let t: unknown = o;
	for (let i = 0; i < ks.length - 1; i++)
	{
		t = isRecord(t) ? t[ks[i]!] : undefined;
		if (!t) return;
	}
	if (isRecord(t)) t[ks[ks.length - 1]!] = v;
}
const COND_LABEL: Record<Cond, string> =
{
	water: "water ahead",
	cmp: "compare a number...",
	knight: "knight ahead",
	blocked: "path blocked",
	left: "knight on my left",
	right: "knight on my right",
	behind: "knight behind me",
	sight: "knight in sight",
	shield: "shield facing me",
	flying: "I'm flying",
	taco: "taco ahead",
};
const SPELL_NAMES = ["Blaze", "Storm", "Shadow"];
let uidc = 1;
const nid = (): string => `k${uidc++}_${Math.floor(Math.random() * 1e5)}`;
export function newBlock(t: BlockType): Block
{
	const b: Block =
	{
		id: nid(),
		type: t,
	};
	if (t === "move" || t === "fly" || t === "set" || t === "change") b.n = 1;
	if (t === "set" || t === "change") b.v = VARS[0] ?? "";
	if (t === "repeat") b.n = 3;
	if (t === "define" || t === "cast") b.name = "Blaze";
	if (BDEF[t].cond) b.cond = "knight";
	if (BDEF[t].body) b.body = [];
	if (BDEF[t].els) b.else = [];
	return b;
}
export function reId(list: Block[]): Block[]
{
	return list.map((b) =>
	{
		const c: Block =
		{
			...b,
			id: nid(),
		};
		if (b.body) c.body = reId(b.body);
		if (b.else) c.else = reId(b.else);
		return c;
	});
}

export function findBlock(
	id: string,
	list: Block[] = play.prog,
):
{
	list: Block[];
	index: number;
	block: Block;
} | null
{
	for (let i = 0; i < list.length; i++)
	{
		const b = list[i]!;
		if (b.id === id)
			return {
				list,
				index: i,
				block: b,
			};
		if (b.body)
		{
			const r = findBlock(id, b.body);
			if (r) return r;
		}
		if (b.else)
		{
			const r = findBlock(id, b.else);
			if (r) return r;
		}
	}
	return null;
}
// the spell always begins with one fixed "When start" hat block
export function ensureStart(): void
{
	const prog = play.prog;
	const others = prog.filter((b) => b.type !== "start");
	const hat = prog.find((b) => b.type === "start") ??
	{
		id: "start_hat",
		type: "start",
	};
	prog.length = 0;
	prog.push(hat, ...others);
}
export function getList(owner: string, slot: string): Block[] | null
{
	if (owner === "root") return play.prog;
	const f = findBlock(owner);
	if (!f) return null;
	return (slot === "else" ? f.block.else : f.block.body) ?? null;
}

type Range = [number, number];
// A box for a typed number. get reads the number it shows and set stores a new one.
function numInput(get: () => number, set: (v: number) => void, range: Range, label: string): HTMLInputElement
{
	const inp = el("input", "numin");
	inp.type = "text";
	inp.inputMode = "numeric";
	inp.value = String(get());
	inp.maxLength = range[0] < -99 ? 4 : 3;
	inp.setAttribute("aria-label", `${label} amount`);
	const clamp = (v: number): number => Math.max(range[0], Math.min(range[1], v));
	const neg = range[0] < 0;
	inp.addEventListener("input", (): void =>
	{
		inp.value = inp.value.replace(neg ? /[^0-9-]/g : /[^0-9]/g, "");
		const v = parseInt(inp.value, 10);
		if (!isNaN(v))
		{
			set(clamp(v));
			saveProg();
		}
	});
	inp.addEventListener("blur", (): void =>
	{
		const v = parseInt(inp.value, 10);
		set(clamp(isNaN(v) ? get() : v));
		inp.value = String(get());
		saveProg();
	});
	inp.addEventListener("keydown", (e): void =>
	{
		if (e.key === "Enter") inp.blur();
		else if (e.key === "ArrowUp")
		{
			set(clamp(get() + 1));
			inp.value = String(get());
			saveProg();
			e.preventDefault();
		}
		else if (e.key === "ArrowDown")
		{
			set(clamp(get() - 1));
			inp.value = String(get());
			saveProg();
			e.preventDefault();
		}
	});
	inp.addEventListener("focus", (): void =>
	{
		inp.select();
	});
	return inp;
}
// a number box: holds a typed number, or a dropped oval (variable, sensor or math)
function slotFor(
	get: () => NumberValue | undefined,
	set: (v: number) => void,
	path: string,
	range: Range,
	label: string,
): HTMLSpanElement
{
	const sp = el("span", "slot");
	sp.dataset["path"] = path;
	const val = get();
	if (typeof val === "object") sp.appendChild(chipFor(val, path));
	else
	{
		if (typeof val !== "number") set(range[0] > 0 ? range[0] : 0);
		sp.appendChild(
			numInput(
				() =>
				{
					const v = get();
					return typeof v === "number" ? v : range[0];
				},
				set,
				range,
				label,
			),
		);
	}
	return sp;
}
const blockSlot = (b: Block, field: "n" | "cn", range: Range, label: string): HTMLSpanElement =>
	slotFor(
		() => b[field],
		(v) =>
		{
			b[field] = v;
		},
		field,
		range,
		label,
	);
const ovalSlot = (val: Oval, field: "a" | "b", path: string, label: string): HTMLSpanElement =>
	slotFor(
		() => val[field],
		(v) =>
		{
			val[field] = v;
		},
		`${path}.${field}`,
		[-999, 999],
		label,
	);
function chipFor(val: Oval, path: string): HTMLSpanElement
{
	if (val.op)
	{
		const c = el("span", "rchip rop");
		c.title = "Drag out to remove";
		if (val.op === "abs")
		{
			c.appendChild(el("span", "opsym", "abs"));
			c.appendChild(ovalSlot(val, "a", path, "Number"));
		}
		else
		{
			c.appendChild(ovalSlot(val, "a", path, "First number"));
			c.appendChild(el("span", "opsym", OPSYM[val.op]));
			c.appendChild(ovalSlot(val, "b", path, "Second number"));
		}
		return c;
	}
	const c = el("span", `rchip ${val.v === undefined ? "rs" : "rv"}`, refLabel(val));
	c.title = "Drag out to remove";
	return c;
}
const blankChip = (): HTMLSpanElement => el("span", "mini", "");
function paletteOpChip(op: MathOp): HTMLSpanElement
{
	const c = el("span", "rchip rop");
	c.dataset["val"] = JSON.stringify(
		op === "abs"
			?
				{
					op,
					a: 0,
				}
			:
				{
					op,
					a: 0,
					b: 0,
				},
	);
	c.title = "Drag into a number box";
	if (op === "abs")
	{
		c.appendChild(el("span", "opsym", "abs"));
		c.appendChild(blankChip());
	}
	else
	{
		c.appendChild(blankChip());
		c.appendChild(el("span", "opsym", OPSYM[op]));
		c.appendChild(blankChip());
	}
	return c;
}
function option(s: HTMLSelectElement, value: string, label: string): void
{
	const o = el("option", null, label);
	o.value = value;
	s.appendChild(o);
}
function varSelect(b: Block): HTMLSelectElement
{
	const s = el("select", "condsel");
	s.setAttribute("aria-label", "Variable");
	const names = VARS.slice();
	if (b.v && !names.includes(b.v)) names.push(b.v);
	if (!names.length) option(s, "", "make a variable first");
	names.forEach((n) =>
	{
		option(s, n, n);
	});
	s.value = b.v ?? "";
	s.addEventListener("change", (): void =>
	{
		b.v = s.value;
		saveProg();
	});
	return s;
}
function valueSelect(b: Block): HTMLSelectElement
{
	const s = el("select", "condsel");
	s.setAttribute("aria-label", "Value to compare");
	const opts = VARS.map((n): [string, string] => [`v:${n}`, n]).concat(
		SENSORS.map((x): [string, string] => [`s:${x}`, SENSOR_LABEL[x]]),
	);
	if (b.cv?.v !== undefined && !VARS.includes(b.cv.v)) opts.unshift([`v:${b.cv.v}`, b.cv.v]);
	opts.forEach(([v, l]) =>
	{
		option(s, v, l);
	});
	s.value = refStr(
		b.cv ??
		{
			s: "wall",
		},
	);
	s.addEventListener("change", (): void =>
	{
		b.cv = parseRef(s.value);
		saveProg();
	});
	return s;
}
const COMPARE_OPS: CompareOp[] = [">", "<", "="];
function opSelect(b: Block): HTMLSelectElement
{
	const s = el("select", "condsel opsel");
	s.setAttribute("aria-label", "Comparison");
	COMPARE_OPS.forEach((v) =>
	{
		option(s, v, v);
	});
	s.value = b.op ?? ">";
	s.addEventListener("change", (): void =>
	{
		b.op = COMPARE_OPS.find((op) => op === s.value)!;
		saveProg();
	});
	return s;
}
const ALL_CONDS: Cond[] = [...CONDS, "cmp"];
function condSelect(b: Block): HTMLSelectElement
{
	const s = el("select", "condsel");
	s.setAttribute("aria-label", "Condition");
	ALL_CONDS.forEach((c) =>
	{
		option(s, c, COND_LABEL[c]);
	});
	s.value = b.cond ?? "knight";
	s.addEventListener("change", (): void =>
	{
		b.cond = ALL_CONDS.find((c) => c === s.value)!;
		if (b.cond === "cmp")
		{
			b.cv ??= VARS.length
				?
					{
						v: VARS[0]!,
					}
				:
					{
						s: "wall",
					};
			b.op ??= ">";
			b.cn ??= 0;
		}
		saveProg();
		renderWS();
	});
	return s;
}
// The middle of a C-shaped block: its arm and the box that holds its inner blocks.
function bodyRow(): [HTMLDivElement, HTMLDivElement]
{
	const m = el("div", "bmid");
	m.appendChild(el("div", "arm"));
	const bd = el("div", "bbody");
	m.appendChild(bd);
	return [m, bd];
}
export function renderBlockEl(b: Block, inPalette: boolean): HTMLDivElement
{
	const d = BDEF[b.type];
	const e = el("div", `blk ${d.cls}${d.body ? " cblk" : ""}${d.hat ? " hat" : ""}`);
	e.dataset["id"] = b.id;
	e.dataset["type"] = b.type;
	const h = el("div", `bhead${d.body ? " chead" : ""}`);
	h.innerHTML = svgIcon(b.type);
	h.appendChild(el("span", null, d.label));
	if (d.spellsel)
	{
		if (inPalette) h.appendChild(el("span", "condsel fake", "Blaze"));
		else
		{
			const ss = el("select", "condsel");
			ss.setAttribute("aria-label", "Spell name");
			SPELL_NAMES.forEach((n) =>
			{
				option(ss, n, n);
			});
			ss.value = b.name ?? "Blaze";
			ss.addEventListener("change", (): void =>
			{
				b.name = ss.value;
				saveProg();
			});
			h.appendChild(ss);
		}
	}
	if (d.varsel)
	{
		if (inPalette) h.appendChild(el("span", "condsel fake", VARS[0] ?? "variable"));
		else h.appendChild(varSelect(b));
		h.appendChild(el("span", null, d.mid));
	}
	if (d.num)
	{
		if (inPalette) h.appendChild(el("span", "numin fake", b.type === "repeat" ? "3" : "1"));
		else h.appendChild(blockSlot(b, "n", d.num, d.label));
	}
	if (d.cond)
	{
		if (inPalette) h.appendChild(el("span", "condsel fake", "..."));
		else
		{
			h.appendChild(condSelect(b));
			if (b.cond === "cmp")
			{
				h.appendChild(valueSelect(b));
				h.appendChild(opSelect(b));
				h.appendChild(blockSlot(b, "cn", [-99, 99], "Compare"));
			}
		}
	}
	if (d.suffix) h.appendChild(el("span", null, d.suffix));
	if (d.tip && inPalette) h.appendChild(el("span", "btip", d.tip));
	if (!inPalette && !d.hat)
	{
		const x = el("button", "del", "×");
		x.title = "Remove block";
		x.setAttribute("aria-label", "Remove block");
		x.addEventListener("click", (ev): void =>
		{
			ev.stopPropagation();
			const f = findBlock(b.id);
			if (f)
			{
				f.list.splice(f.index, 1);
				renderWS();
				saveProg();
			}
		});
		h.appendChild(x);
	}
	e.appendChild(h);
	if (d.body && !inPalette)
	{
		const [m1, b1] = bodyRow();
		b1.appendChild(renderList(b.body ?? [], b.id, "body"));
		e.appendChild(m1);
		if (d.els)
		{
			const ee = el("div", "belse");
			ee.appendChild(el("span", null, "else"));
			e.appendChild(ee);
			const [m2, b2] = bodyRow();
			b2.appendChild(renderList(b.else ?? [], b.id, "else"));
			e.appendChild(m2);
		}
		e.appendChild(el("div", `bfoot${d.cap ? " capfoot" : ""}`));
	}
	return e;
}
function renderList(list: Block[], owner: string, slot: string): HTMLDivElement
{
	const L = el("div", "blist");
	L.dataset["owner"] = owner;
	L.dataset["slot"] = slot;
	list.forEach((b) => L.appendChild(renderBlockEl(b, false)));
	return L;
}

export function saveProg(): void
{
	const key = play.ctx?.key;
	if (key) progCache[key] = play.prog;
	updateWsEmpty();
}

const PCATS:
{
	id: string;
	name: string;
	color: string;
	blocks: BlockType[];
	needs?: BlockType;
}[] = [
	{
		id: "move",
		name: "Move",
		color: "#4f8a3a",
		blocks: ["move", "fly", "takeoff", "land", "left", "right", "around"],
	},
	{
		id: "attack",
		name: "Attack",
		color: "#c4432a",
		blocks: ["attack", "whip", "fireball", "firespin"],
	},
	{
		id: "powers",
		name: "Powers",
		color: "#5d4ac9",
		blocks: ["gust", "roar", "curl"],
	},
	{
		id: "control",
		name: "Control",
		color: "#7a4f9a",
		blocks: ["wait", "repeat", "until", "forever", "if"],
	},
	{
		id: "vars",
		name: "Variables",
		color: "#e87b14",
		blocks: ["set", "change"],
	},
	{
		id: "math",
		name: "Math",
		color: "#4caf50",
		blocks: [],
		needs: "set",
	},
	{
		id: "spells",
		name: "My Spells",
		color: "#d94f8a",
		blocks: ["define", "cast"],
	},
];
const MATH_OPS: MathOp[] = ["+", "-", "*", "/", "%", "abs"];
export function renderPalette(): void
{
	const p = $("#palette");
	p.innerHTML = "";
	const allowed = paletteBlocks();
	const cats = PCATS.filter((c) => (c.needs ? allowed.includes(c.needs) : c.blocks.some((b) => allowed.includes(b))));
	if (!cats.find((c) => c.id === prefs.palCat)) prefs.palCat = cats[0] ? cats[0].id : "move";
	if (cats.length > 1)
	{
		const tabs = el("div", "ptabs");
		tabs.setAttribute("role", "tablist");
		cats.forEach((c) =>
		{
			const t = el("button", `ptab${c.id === prefs.palCat ? " on" : ""}`);
			t.setAttribute("role", "tab");
			t.setAttribute("aria-selected", c.id === prefs.palCat ? "true" : "false");
			const dot = el("span", "dot");
			dot.style.background = c.color;
			t.appendChild(dot);
			t.appendChild(el("span", null, c.name));
			if (c.blocks.some(isNewHere)) t.appendChild(el("span", "newtag", "NEW"));
			t.addEventListener("click", (): void =>
			{
				prefs.palCat = c.id;
				store.set("dc_palcat", prefs.palCat);
				renderPalette();
			});
			tabs.appendChild(t);
		});
		p.appendChild(tabs);
	}
	const cat = cats.find((c) => c.id === prefs.palCat) ??
	{
		id: "",
		blocks: allowed,
	};
	const area = el("div", "pblocks");
	cat.blocks
		.filter((t) => allowed.includes(t))
		.forEach((t) =>
		{
			const e = renderBlockEl(
				{
					id: "",
					type: t,
				},
				true,
			);
			e.dataset["palette"] = t;
			e.title = "Drag into your spell, or tap to add at the end";
			if (isNewHere(t))
			{
				e.classList.add("isnew");
				e.querySelector(".bhead")!.appendChild(el("span", "newtag", "NEW"));
			}
			area.appendChild(e);
		});
	if (cat.id === "vars")
	{
		const mk = el("button", "btn small", "+ Make a variable");
		mk.addEventListener("click", makeVariable);
		area.appendChild(mk);
		VARS.forEach((n) =>
		{
			const c = el("span", "rchip rv", n);
			c.dataset["val"] = JSON.stringify(
				{
					v: n,
				},
			);
			c.title = "Drag into a number box";
			const x = el("button", "rdel", "×");
			x.setAttribute("aria-label", `Delete variable ${n}`);
			x.addEventListener("click", (ev): void =>
			{
				ev.stopPropagation();
				VARS = VARS.filter((v) => v !== n);
				saveVars();
				renderPalette();
				renderWS();
			});
			c.appendChild(x);
			area.appendChild(c);
		});
		SENSORS.forEach((x) =>
		{
			const c = el("span", "rchip rs", SENSOR_LABEL[x]);
			c.dataset["val"] = JSON.stringify(
				{
					s: x,
				},
			);
			c.title = "Drag into a number box";
			area.appendChild(c);
		});
	}
	if (cat.id === "math") MATH_OPS.forEach((op) => area.appendChild(paletteOpChip(op)));
	p.appendChild(area);
	p.appendChild(
		el(
			"p",
			"palette-hint",
			cat.id === "math"
				? "Drop a math oval into a number box, then fill in its own boxes. Ovals can go inside other ovals!"
				: cat.id === "vars"
					? "Drag the ovals into any number box."
					: "Drag blocks into your spell, or tap one to add it to the end.",
		),
	);
}
function makeVariable(): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, "New variable"));
		c.appendChild(el("p", null, "Give it a short name, like steps or count."));
		const inp = el("input");
		inp.id = "newvar";
		inp.maxLength = 12;
		inp.placeholder = "steps";
		inp.autocomplete = "off";
		inp.style.cssText =
			"font-size:1.1rem;padding:.4em .6em;border:2px solid #3b2716;border-radius:6px;background:#fbf3dc;text-align:center";
		c.appendChild(inp);
		const msg = el("p", "status", "");
		c.appendChild(msg);
		const go = (): void =>
		{
			const n = inp.value.trim().replace(/\s+/g, " ");
			if (!/^[A-Za-z][A-Za-z0-9 ]{0,11}$/.test(n))
			{
				msg.textContent = "Start with a letter. Letters, numbers and spaces only.";
				return;
			}
			if (VARS.includes(n))
			{
				msg.textContent = `You already have a variable called ${n}.`;
				return;
			}
			VARS.push(n);
			saveVars();
			const fill = (list: Block[]): void =>
			{
				list.forEach((b) =>
				{
					if ((b.type === "set" || b.type === "change") && !b.v) b.v = n;
					if (b.body) fill(b.body);
					if (b.else) fill(b.else);
				});
			};
			fill(play.prog);
			closeModal();
			renderPalette();
			renderWS();
			saveProg();
		};
		inp.addEventListener("keydown", (e): void =>
		{
			if (e.key === "Enter") go();
		});
		const r = el("div", "row");
		mBtn(r, "Create", "fire", go);
		mBtn(r, "Cancel", "", closeModal);
		c.appendChild(r);
		setTimeout(() =>
		{
			inp.focus();
		}, 40);
	});
}
/* live variable values on the board */
export function updateMonitor(): void
{
	const m = $("#var-monitor");
	const names = [...collectVars(play.prog)];
	if (!names.length)
	{
		m.classList.add("hidden");
		return;
	}
	m.classList.remove("hidden");
	m.innerHTML = "";
	names.forEach((n) =>
	{
		const r = el("div", "vrow");
		r.appendChild(el("span", "vname", n));
		r.appendChild(el("span", "vval", String(play.lastVars[n] ?? 0)));
		m.appendChild(r);
	});
}
export function renderWS(): void
{
	ensureStart();
	const ws = $("#ws");
	const keep = ws.scrollTop;
	ws.querySelectorAll(".blist,.dropline").forEach((n) =>
	{
		n.remove();
	});
	const root = renderList(play.prog, "root", "body");
	root.classList.add("rootlist");
	ws.appendChild(root);
	ws.scrollTop = keep;
	updateWsEmpty();
	updateBlockCount();
}
function updateWsEmpty(): void
{
	$("#ws-empty").classList.toggle("hidden", play.prog.length > 1);
	updateBlockCount();
	updateMonitor();
}
function updateBlockCount(): void
{
	const n = countBlocks(play.prog);
	$("#blockcount").textContent = n + (n === 1 ? " block" : " blocks");
	if (play.ctx) updateCrown();
}
