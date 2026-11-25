// The rules of the game with no DOM: the board state, one step of the dragon and the knights, the block interpreter,
// the solver the wizard uses for hints, and the level generator for the Endless Siege. It runs in the page and in the
// solver's Web Worker (src/game/solver.worker.ts).

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;
export const MAXT = 300;
const ARROW_RANGE = 5,
	FIREBALL_RANGE = 5;
const PASS = (c: string): boolean => c === "." || c === "," || c === "t";
export const KTYPES = ["soldier", "shield", "archer", "rider", "spearman", "paladin"] as const;
export type KnightType = (typeof KTYPES)[number];
export const CONDS = [
	"knight",
	"blocked",
	"left",
	"right",
	"behind",
	"sight",
	"shield",
	"flying",
	"taco",
	"water",
] as const;
export type Cond = (typeof CONDS)[number] | "cmp";
export const SENSORS = ["wall", "knights", "hearts", "fireballs", "kdist"] as const;
export type Sensor = (typeof SENSORS)[number];
export type MathOp = "+" | "-" | "*" | "/" | "%" | "abs";
export type CompareOp = ">" | "<" | "=";

// What a number slot holds besides a typed number: a math oval ({op, a, b}), a variable ({v}) or a sensor ({s}).
export interface Oval
{
	op?: MathOp;
	a?: NumberValue;
	b?: NumberValue;
	v?: string;
	s?: Sensor;
}
export type NumberValue = number | Oval;

export const BLOCK_TYPES = [
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
	"start",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export interface Block
{
	id: string;
	type: BlockType;
	n?: NumberValue;
	v?: string;
	name?: string;
	cond?: Cond;
	cv?: Oval;
	op?: CompareOp;
	cn?: NumberValue;
	body?: Block[];
	else?: Block[];
}

// The primitive actions the dragon takes one per step, as the interpreter yields them and the solver searches them.
export type Action =
	| "step"
	| "left"
	| "right"
	| "around"
	| "attack"
	| "whip"
	| "fireball"
	| "charge"
	| "takeoff"
	| "land"
	| "wait"
	| "gust"
	| "roar"
	| "firespin"
	| "spinup"
	| "spin"
	| "curl"
	| "flyfail";

export interface Facing
{
	x: number;
	y: number;
	d: number;
}

export interface KnightSpec extends Facing
{
	type: KnightType;
	prog: string;
}

export interface Level
{
	name?: string;
	intro?: string;
	w: number;
	h: number;
	map: string[];
	dragon: Facing;
	knights: KnightSpec[];
	hearts?: number;
	fireballs?: number;
	newBlocks?: BlockType[];
	solution?: Action[];
	crown?: number;
	diff?: number;
}

export interface DragonState extends Facing
{
	fly: boolean;
	hp: number;
	charged: boolean;
	spun: boolean;
	curl: boolean;
	ammo: number;
}

export interface KnightState extends Facing
{
	id: number;
	type: KnightType;
	prog: string[];
	pc: number;
	alive: boolean;
	hp: number;
	shield: boolean;
	stun: number;
}

export interface Ball extends Facing
{
	id: number;
	dist: number;
	dead?: boolean;
}

export type Over = "win" | "lose" | "nocode" | "timeout";

// What the board shows. The editor draws a board that may have no dragon yet.
export interface BoardState
{
	w: number;
	h: number;
	tiles: string[];
	dragon: DragonState | null;
	knights: KnightState[];
	balls: Ball[];
}

export interface State extends BoardState
{
	dragon: DragonState;
	ballSeq: number;
	tick: number;
	over: Over | null;
}

type Cell = [number, number];
export type GameEvent =
	|
	  {
			t: "blocked" | "hit";
			id: number;
	  }
	|
	  {
			t: "armor";
			id: number;
			x: number;
			y: number;
	  }
	|
	  {
			t: "burn";
			id: number;
			x: number;
			y: number;
			big: boolean;
	  }
	|
	  {
			t: "tree" | "taco";
			x: number;
			y: number;
	  }
	|
	  {
			t: "blast";
			x: number;
			y: number;
			d: number;
			cells: Cell[];
	  }
	|
	  {
			t: "knock";
			n: number;
	  }
	|
	  {
			t: "fbhit";
			id: number;
			x: number;
			y: number;
			wall?: boolean;
			fizzle?: boolean;
	  }
	|
	  {
			t: "clang";
			x: number;
			y: number;
			id: number;
			broke: boolean;
	  }
	|
	  {
			t: "curl" | "spinup" | "flyfail" | "takeoff" | "cantland" | "land" | "charge" | "bump";
	  }
	|
	  {
			t: "roar";
			x: number;
			y: number;
			ids: number[];
	  }
	|
	  {
			t: "gust" | "fire" | "whip" | "launch";
			x: number;
			y: number;
			d: number;
			id?: number;
	  }
	|
	  {
			t: "drown";
			id: number;
			x: number;
			y: number;
	  }
	|
	  {
			t: "push" | "trample" | "stunned";
			id: number;
	  }
	|
	  {
			t: "fizzle";
			what: "spin" | "fire" | "whip" | "fireball" | "noammo";
	  }
	|
	  {
			t: "spin";
			x: number;
			y: number;
	  }
	|
	  {
			t: "arrow";
			id: number;
			x0: number;
			y0: number;
			x1: number;
			y1: number;
			hit: boolean;
	  }
	|
	  {
			t: "stab";
			id: number;
			x: number;
			y: number;
	  };

export function makeState(L: Level): State
{
	return {
		w: L.w,
		h: L.h,
		tiles: L.map.join("").split(""),
		dragon:
		{
			x: L.dragon.x,
			y: L.dragon.y,
			d: L.dragon.d,
			fly: false,
			hp: L.hearts ?? 3,
			charged: false,
			spun: false,
			curl: false,
			ammo: L.fireballs ?? 2,
		},
		balls: [],
		ballSeq: 0,
		knights: L.knights.map((k, i) => (
		{
			id: i,
			type: k.type,
			x: k.x,
			y: k.y,
			d: k.d,
			prog: k.prog.split(""),
			pc: 0,
			alive: true,
			hp: k.type === "paladin" ? 2 : 1,
			shield: k.type === "shield",
			stun: 0,
		})),
		tick: 0,
		over: null,
	};
}
export function cloneState(s: State): State
{
	return {
		w: s.w,
		h: s.h,
		tiles: s.tiles.slice(),
		dragon:
		{
			...s.dragon,
		},
		knights: s.knights.map((k) => (
		{
			...k,
		})),
		balls: s.balls.map((b) => (
		{
			...b,
		})),
		ballSeq: s.ballSeq,
		tick: s.tick,
		over: s.over,
	};
}
const inb = (s: BoardState, x: number, y: number): boolean => x >= 0 && y >= 0 && x < s.w && y < s.h;
const tile = (s: BoardState, x: number, y: number): string => s.tiles[y * s.w + x]!;
const setTile = (s: State, x: number, y: number, c: string): void =>
{
	s.tiles[y * s.w + x] = c;
};
function knightAt(s: State, x: number, y: number, except?: KnightState): KnightState | null
{
	for (const k of s.knights) if (k.alive && k.x === x && k.y === y && k !== except) return k;
	return null;
}
function hitDragon(s: State, ev: GameEvent[], k: KnightState): void
{
	if (s.dragon.curl)
	{
		ev.push(
			{
				t: "blocked",
				id: k.id,
			},
		);
		return;
	}
	s.dragon.hp--;
	ev.push(
		{
			t: "hit",
			id: k.id,
		},
	);
}
const shieldBlocks = (k: KnightState, attackDir: number): boolean =>
	k.type === "shield" && k.shield && k.d === (attackDir + 2) % 4;
function damage(k: KnightState, ev: GameEvent[], x: number, y: number, big = false): void
{
	if (!big && k.type === "paladin" && k.hp > 1)
	{
		k.hp--;
		ev.push(
			{
				t: "armor",
				id: k.id,
				x,
				y,
			},
		);
		return;
	}
	k.alive = false;
	k.hp = 0;
	ev.push(
		{
			t: "burn",
			id: k.id,
			x,
			y,
			big,
		},
	);
}

function cond(s: State, c: Cond): boolean
{
	const D = s.dragon;
	const at = (dd: number, n: number): Cell => [D.x + DX[dd]! * n, D.y + DY[dd]! * n];
	const kIn = (dd: number): boolean =>
	{
		const [x, y] = at(dd, 1);
		return inb(s, x, y) && !!knightAt(s, x, y);
	};
	switch (c)
	{
		case "knight":
			return kIn(D.d);
		case "left":
			return kIn((D.d + 3) % 4);
		case "right":
			return kIn((D.d + 1) % 4);
		case "behind":
			return kIn((D.d + 2) % 4);
		case "blocked":
		{
			const [x, y] = at(D.d, 1);
			if (!inb(s, x, y)) return true;
			if (D.fly) return false;
			return !PASS(tile(s, x, y)) || !!knightAt(s, x, y);
		}
		case "sight":
		{
			for (let i = 1; i < 20; i++)
			{
				const [x, y] = at(D.d, i);
				if (!inb(s, x, y)) return false;
				if (knightAt(s, x, y)) return true;
				const t = tile(s, x, y);
				if (t === "#" || t === "T") return false;
			}
			return false;
		}
		case "shield":
		{
			const [x, y] = at(D.d, 1);
			if (!inb(s, x, y)) return false;
			const k = knightAt(s, x, y);
			return !!k && shieldBlocks(k, D.d);
		}
		case "flying":
			return D.fly;
		case "taco":
		{
			const [x, y] = at(D.d, 1);
			return inb(s, x, y) && tile(s, x, y) === "t";
		}
		case "water":
		{
			const [x, y] = at(D.d, 1);
			return inb(s, x, y) && tile(s, x, y) === "~";
		}
		case "cmp":
			return false;
	}
	throw new Error("unreachable: the switch covers every case");
}

function sense(s: State, name: Sensor): number
{
	const D = s.dragon;
	switch (name)
	{
		case "wall":
		{
			let n = 0;
			let x = D.x,
				y = D.y;
			for (let i = 0; i < 30; i++)
			{
				x += DX[D.d]!;
				y += DY[D.d]!;
				if (!inb(s, x, y)) break;
				if (!D.fly && (!PASS(tile(s, x, y)) || knightAt(s, x, y))) break;
				n++;
			}
			return n;
		}
		case "knights":
			return s.knights.filter((k) => k.alive).length;
		case "hearts":
			return D.hp;
		case "fireballs":
			return D.ammo;
		case "kdist":
		{
			for (let i = 1; i < 30; i++)
			{
				const x = D.x + DX[D.d]! * i,
					y = D.y + DY[D.d]! * i;
				if (!inb(s, x, y)) return 0;
				if (knightAt(s, x, y)) return i;
				const t = tile(s, x, y);
				if (t === "#" || t === "T") return 0;
			}
			return 0;
		}
	}
	throw new Error("unreachable: the switch covers every case");
}

interface Control
{
	cancel: boolean;
	yields: number;
	vars: Record<string, number>;
	defs: Record<string, Block[]>;
	depth: number;
}

// a number slot holds a plain number, {v:'name'} (variable), {s:'sensor'} or a math oval
function num(s: State, ctl: Control, x: NumberValue | undefined): number
{
	if (typeof x === "number") return x;
	if (x === undefined) return 0;
	if (x.op)
	{
		const a = num(s, ctl, x.a),
			b = num(s, ctl, x.b);
		let r = 0;
		switch (x.op)
		{
			case "+":
				r = a + b;
				break;
			case "-":
				r = a - b;
				break;
			case "*":
				r = a * b;
				break;
			case "/":
				r = b === 0 ? 0 : Math.trunc(a / b);
				break;
			case "%":
				r = b === 0 ? 0 : a % b;
				break;
			case "abs":
				r = Math.abs(a);
				break;
		}
		return Math.max(-9999, Math.min(9999, r));
	}
	if (x.v !== undefined) return ctl.vars[x.v] ?? 0;
	if (x.s) return sense(s, x.s);
	return 0;
}
function testCond(s: State, ctl: Control, b: Block): boolean
{
	if (b.cond === "cmp")
	{
		const a = num(
				s,
				ctl,
				b.cv ??
				{
					s: "wall",
				},
			),
			c = num(s, ctl, b.cn ?? 0);
		return b.op === "<" ? a < c : b.op === "=" ? a === c : a > c;
	}
	return cond(s, b.cond ?? "knight");
}
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(v)));

function eatTaco(s: State, ev: GameEvent[]): void
{
	const D = s.dragon;
	setTile(s, D.x, D.y, ".");
	const cells: Cell[] = [];
	let x = D.x + DX[D.d]!,
		y = D.y + DY[D.d]!;
	while (inb(s, x, y))
	{
		cells.push([x, y]);
		const k = knightAt(s, x, y);
		if (k) damage(k, ev, x, y, true);
		if (tile(s, x, y) === "T")
		{
			setTile(s, x, y, ",");
			ev.push(
				{
					t: "tree",
					x,
					y,
				},
			);
		}
		x += DX[D.d]!;
		y += DY[D.d]!;
	}
	ev.push(
		{
			t: "blast",
			x: D.x,
			y: D.y,
			d: D.d,
			cells,
		},
	);
	const bd = (D.d + 2) % 4;
	let n = 0;
	for (;;)
	{
		const nx = D.x + DX[bd]!,
			ny = D.y + DY[bd]!;
		if (!inb(s, nx, ny) || !PASS(tile(s, nx, ny)) || knightAt(s, nx, ny)) break;
		D.x = nx;
		D.y = ny;
		n++;
	}
	ev.push(
		{
			t: "knock",
			n,
		},
	);
}

// fireballs fly one square per step; knights can dodge them
function ballHit(s: State, b: Ball, ev: GameEvent[]): boolean
{
	const k = knightAt(s, b.x, b.y);
	if (!k) return false;
	b.dead = true;
	ev.push(
		{
			t: "fbhit",
			id: b.id,
			x: b.x,
			y: b.y,
		},
	);
	if (shieldBlocks(k, b.d))
	{
		k.shield = false;
		ev.push(
			{
				t: "clang",
				x: b.x,
				y: b.y,
				id: k.id,
				broke: true,
			},
		);
	}
	else damage(k, ev, b.x, b.y);
	return true;
}
function moveBall(s: State, b: Ball, ev: GameEvent[]): void
{
	const nx = b.x + DX[b.d]!,
		ny = b.y + DY[b.d]!;
	if (!inb(s, nx, ny) || tile(s, nx, ny) === "#")
	{
		b.dead = true;
		ev.push(
			{
				t: "fbhit",
				id: b.id,
				x: b.x,
				y: b.y,
				wall: true,
			},
		);
		return;
	}
	b.x = nx;
	b.y = ny;
	b.dist++;
	if (ballHit(s, b, ev)) return;
	if (tile(s, nx, ny) === "T")
	{
		setTile(s, nx, ny, ",");
		ev.push(
			{
				t: "tree",
				x: nx,
				y: ny,
			},
		);
		b.dead = true;
		ev.push(
			{
				t: "fbhit",
				id: b.id,
				x: nx,
				y: ny,
			},
		);
		return;
	}
	if (b.dist >= FIREBALL_RANGE)
	{
		b.dead = true;
		ev.push(
			{
				t: "fbhit",
				id: b.id,
				x: nx,
				y: ny,
				fizzle: true,
			},
		);
	}
}
function advanceBalls(s: State, ev: GameEvent[]): void
{
	for (const b of s.balls) if (!b.dead) moveBall(s, b, ev);
	s.balls = s.balls.filter((b) => !b.dead);
}
// Burns a knight with a hit that a shield facing it blocks, as breath, tail and fire spin do.
function strike(k: KnightState, dir: number, ev: GameEvent[], x: number, y: number): void
{
	if (shieldBlocks(k, dir))
	{
		k.shield = false;
		ev.push(
			{
				t: "clang",
				x,
				y,
				id: k.id,
				broke: true,
			},
		);
	}
	else damage(k, ev, x, y);
}
function dragonAction(
	s: State,
	act: Action,
	ev: GameEvent[],
):
{
	cancel: boolean;
} | null
{
	const D = s.dragon;
	if (act !== "fireball") D.charged = false;
	if (act !== "spin") D.spun = false;
	D.curl = act === "curl";
	switch (act)
	{
		case "curl":
			ev.push(
				{
					t: "curl",
				},
			);
			return null;
		case "roar":
		{
			const hit: number[] = [];
			for (const k of s.knights)
				if (k.alive && Math.abs(k.x - D.x) + Math.abs(k.y - D.y) <= 3)
				{
					k.stun = 3;
					hit.push(k.id);
				}
			ev.push(
				{
					t: "roar",
					x: D.x,
					y: D.y,
					ids: hit,
				},
			);
			return null;
		}
		case "gust":
		{
			const fx = D.x + DX[D.d]!,
				fy = D.y + DY[D.d]!;
			ev.push(
				{
					t: "gust",
					x: D.x,
					y: D.y,
					d: D.d,
				},
			);
			if (!inb(s, fx, fy)) return null;
			const k = knightAt(s, fx, fy);
			if (!k) return null;
			const n = k.type === "paladin" ? 1 : 2;
			for (let i = 0; i < n; i++)
			{
				const nx = k.x + DX[D.d]!,
					ny = k.y + DY[D.d]!;
				if (!inb(s, nx, ny)) break;
				const t = tile(s, nx, ny);
				if (t === "#" || t === "T" || knightAt(s, nx, ny, k) || (D.x === nx && D.y === ny)) break;
				k.x = nx;
				k.y = ny;
				if (t === "~")
				{
					k.alive = false;
					k.hp = 0;
					ev.push(
						{
							t: "drown",
							id: k.id,
							x: nx,
							y: ny,
						},
					);
					break;
				}
			}
			ev.push(
				{
					t: "push",
					id: k.id,
				},
			);
			return null;
		}
		case "spinup":
		{
			if (D.fly)
			{
				ev.push(
					{
						t: "fizzle",
						what: "spin",
					},
				);
				return null;
			}
			D.spun = true;
			ev.push(
				{
					t: "spinup",
				},
			);
			return null;
		}
		case "spin":
		{
			if (D.fly || !D.spun)
			{
				D.spun = false;
				ev.push(
					{
						t: "fizzle",
						what: "spin",
					},
				);
				return null;
			}
			D.spun = false;
			ev.push(
				{
					t: "spin",
					x: D.x,
					y: D.y,
				},
			);
			for (let dd = 0; dd < 4; dd++)
			{
				const x = D.x + DX[dd]!,
					y = D.y + DY[dd]!;
				if (!inb(s, x, y)) continue;
				const k = knightAt(s, x, y);
				if (k) strike(k, dd, ev, x, y);
				else if (tile(s, x, y) === "T")
				{
					setTile(s, x, y, ",");
					ev.push(
						{
							t: "tree",
							x,
							y,
						},
					);
				}
			}
			return null;
		}
		case "left":
			D.d = (D.d + 3) % 4;
			return null;
		case "right":
			D.d = (D.d + 1) % 4;
			return null;
		case "around":
			D.d = (D.d + 2) % 4;
			return null;
		case "wait":
			return null;
		case "flyfail":
			ev.push(
				{
					t: "flyfail",
				},
			);
			return null;
		case "takeoff":
			if (!D.fly)
			{
				D.fly = true;
				ev.push(
					{
						t: "takeoff",
					},
				);
			}
			return null;
		case "land":
		{
			if (!D.fly) return null;
			const c = tile(s, D.x, D.y);
			if (!PASS(c) || knightAt(s, D.x, D.y))
			{
				ev.push(
					{
						t: "cantland",
					},
				);
				return null;
			}
			D.fly = false;
			ev.push(
				{
					t: "land",
				},
			);
			if (c === "t")
			{
				ev.push(
					{
						t: "taco",
						x: D.x,
						y: D.y,
					},
				);
				eatTaco(s, ev);
			}
			return null;
		}
		case "attack":
		{
			if (D.fly)
			{
				ev.push(
					{
						t: "fizzle",
						what: "fire",
					},
				);
				return null;
			}
			const fx = D.x + DX[D.d]!,
				fy = D.y + DY[D.d]!;
			ev.push(
				{
					t: "fire",
					x: fx,
					y: fy,
					d: D.d,
				},
			);
			if (!inb(s, fx, fy)) return null;
			const k = knightAt(s, fx, fy);
			if (k) strike(k, D.d, ev, fx, fy);
			else if (tile(s, fx, fy) === "T")
			{
				setTile(s, fx, fy, ",");
				ev.push(
					{
						t: "tree",
						x: fx,
						y: fy,
					},
				);
			}
			return null;
		}
		case "whip":
		{
			if (D.fly)
			{
				ev.push(
					{
						t: "fizzle",
						what: "whip",
					},
				);
				return null;
			}
			const bd = (D.d + 2) % 4,
				bx = D.x + DX[bd]!,
				by = D.y + DY[bd]!;
			ev.push(
				{
					t: "whip",
					x: bx,
					y: by,
					d: bd,
				},
			);
			if (!inb(s, bx, by)) return null;
			const k = knightAt(s, bx, by);
			if (k) strike(k, bd, ev, bx, by);
			return null;
		}
		case "charge":
		{
			if (D.fly)
			{
				ev.push(
					{
						t: "fizzle",
						what: "fireball",
					},
				);
				return null;
			}
			D.charged = true;
			ev.push(
				{
					t: "charge",
				},
			);
			return null;
		}
		case "fireball":
		{
			if (D.fly || !D.charged)
			{
				D.charged = false;
				ev.push(
					{
						t: "fizzle",
						what: "fireball",
					},
				);
				return null;
			}
			D.charged = false;
			if (D.ammo <= 0)
			{
				ev.push(
					{
						t: "fizzle",
						what: "noammo",
					},
				);
				return null;
			}
			D.ammo--;
			const b: Ball =
			{
				id: ++s.ballSeq,
				x: D.x,
				y: D.y,
				d: D.d,
				dist: 0,
			};
			s.balls.push(b);
			ev.push(
				{
					t: "launch",
					id: b.id,
					x: D.x,
					y: D.y,
					d: D.d,
				},
			);
			moveBall(s, b, ev);
			s.balls = s.balls.filter((x) => !x.dead);
			return null;
		}
		case "step":
		{
			const nx = D.x + DX[D.d]!,
				ny = D.y + DY[D.d]!;
			if (!inb(s, nx, ny))
			{
				ev.push(
					{
						t: "bump",
					},
				);
				return {
					cancel: true,
				};
			}
			if (D.fly)
			{
				D.x = nx;
				D.y = ny;
				return null;
			}
			const c = tile(s, nx, ny);
			if (!PASS(c) || knightAt(s, nx, ny))
			{
				ev.push(
					{
						t: "bump",
					},
				);
				return {
					cancel: true,
				};
			}
			D.x = nx;
			D.y = ny;
			if (c === "t")
			{
				ev.push(
					{
						t: "taco",
						x: D.x,
						y: D.y,
					},
				);
				eatTaco(s, ev);
				return {
					cancel: true,
				};
			}
			return null;
		}
		// The interpreter turns Fire spin into spinup and spin; on its own it does nothing, as in the original.
		case "firespin":
			return null;
	}
	throw new Error("unreachable: the switch covers every case");
}

const reach = (k: KnightState): number => (k.type === "spearman" ? 2 : 1);
function dragonInSight(s: State, k: KnightState): boolean
{
	const D = s.dragon;
	if (k.type === "archer")
	{
		if (!D.fly) return false;
		for (let i = 1; i <= ARROW_RANGE; i++)
		{
			const x = k.x + DX[k.d]! * i,
				y = k.y + DY[k.d]! * i;
			if (!inb(s, x, y)) break;
			if (D.x === x && D.y === y) return true;
		}
		return false;
	}
	if (D.fly) return false;
	for (let i = 1; i <= reach(k); i++) if (D.x === k.x + DX[k.d]! * i && D.y === k.y + DY[k.d]! * i) return true;
	return false;
}
function faceDragon(s: State, k: KnightState): void
{
	const D = s.dragon,
		dx = D.x - k.x,
		dy = D.y - k.y;
	if (!dx && !dy) return;
	if (Math.abs(dx) >= Math.abs(dy)) k.d = dx > 0 ? 1 : 3;
	else k.d = dy > 0 ? 2 : 0;
}

function knightStep(s: State, k: KnightState, ev: GameEvent[]): void
{
	const D = s.dragon;
	const n = k.type === "rider" ? 2 : 1;
	for (let i = 0; i < n; i++)
	{
		const nx = k.x + DX[k.d]!,
			ny = k.y + DY[k.d]!;
		if (!inb(s, nx, ny) || !PASS(tile(s, nx, ny)) || knightAt(s, nx, ny, k)) break;
		if (D.x === nx && D.y === ny && !D.fly)
		{
			if (k.type === "rider")
			{
				ev.push(
					{
						t: "trample",
						id: k.id,
					},
				);
				hitDragon(s, ev, k);
			}
			break;
		}
		k.x = nx;
		k.y = ny;
	}
}

function knightsAct(s: State, ev: GameEvent[]): void
{
	const D = s.dragon;
	for (const k of s.knights)
	{
		if (!k.alive || s.over) continue;
		if (k.stun > 0)
		{
			k.stun--;
			ev.push(
				{
					t: "stunned",
					id: k.id,
				},
			);
			continue;
		}
		let op = k.prog[k.pc]!;
		k.pc = (k.pc + 1) % k.prog.length;
		if (op === "G") op = dragonInSight(s, k) ? "A" : "W";
		switch (op)
		{
			case "F":
				knightStep(s, k, ev);
				break;
			case "T":
				faceDragon(s, k);
				break;
			case "C":
				faceDragon(s, k);
				knightStep(s, k, ev);
				break;
			case "L":
				k.d = (k.d + 3) % 4;
				break;
			case "R":
				k.d = (k.d + 1) % 4;
				break;
			case "U":
				k.d = (k.d + 2) % 4;
				break;
			case "A":
			{
				if (k.type === "archer")
				{
					let ex = k.x,
						ey = k.y,
						hit = false;
					for (let i = 1; i <= ARROW_RANGE; i++)
					{
						const x = k.x + DX[k.d]! * i,
							y = k.y + DY[k.d]! * i;
						if (!inb(s, x, y)) break;
						ex = x;
						ey = y;
						if (D.fly && D.x === x && D.y === y)
						{
							hit = true;
							break;
						}
					}
					ev.push(
						{
							t: "arrow",
							id: k.id,
							x0: k.x,
							y0: k.y,
							x1: ex,
							y1: ey,
							hit,
						},
					);
					if (hit) hitDragon(s, ev, k);
				}
				else
				{
					let hit = false;
					for (let i = 1; i <= reach(k); i++)
					{
						const fx = k.x + DX[k.d]! * i,
							fy = k.y + DY[k.d]! * i;
						if (!inb(s, fx, fy)) break;
						ev.push(
							{
								t: "stab",
								id: k.id,
								x: fx,
								y: fy,
							},
						);
						if (!hit && !D.fly && D.x === fx && D.y === fy)
						{
							hit = true;
							hitDragon(s, ev, k);
						}
					}
				}
				break;
			}
		}
		if (D.hp <= 0) s.over = "lose";
	}
}

function checkEnd(s: State): void
{
	if (s.dragon.hp <= 0)
	{
		s.over = "lose";
		return;
	}
	if (s.knights.every((k) => !k.alive)) s.over = "win";
}

function tickWith(
	s: State,
	act: Action,
	ev: GameEvent[],
):
{
	cancel: boolean;
} | null
{
	if (s.balls.length) advanceBalls(s, ev);
	checkEnd(s);
	const r = s.over ? null : dragonAction(s, act, ev);
	checkEnd(s);
	if (!s.over)
	{
		knightsAct(s, ev);
		for (const b of s.balls) if (!b.dead) ballHit(s, b, ev);
		s.balls = s.balls.filter((b) => !b.dead);
		checkEnd(s);
	}
	s.tick++;
	if (!s.over && s.tick >= MAXT) s.over = "timeout";
	return r;
}

interface Yielded
{
	act: Action;
	id: string | null;
}
function* interp(list: Block[], s: State, ctl: Control): Generator<Yielded, void, undefined>
{
	for (const b of list)
	{
		switch (b.type)
		{
			case "move":
			{
				const n = clampN(num(s, ctl, b.n), 0, 30);
				for (let i = 0; i < n; i++)
				{
					yield {
						act: "step",
						id: b.id,
					};
					if (ctl.cancel)
					{
						ctl.cancel = false;
						break;
					}
				}
				break;
			}
			case "fly":
			{
				const n = clampN(num(s, ctl, b.n), 0, 30);
				if (!s.dragon.fly)
				{
					yield {
						act: "flyfail",
						id: b.id,
					};
					break;
				} // must Take off first
				for (let i = 0; i < n; i++)
				{
					yield {
						act: "step",
						id: b.id,
					};
					if (ctl.cancel)
					{
						ctl.cancel = false;
						break;
					}
				}
				break;
			}
			case "fireball":
				yield {
					act: "charge",
					id: b.id,
				};
				yield {
					act: "fireball",
					id: b.id,
				};
				break;
			case "repeat":
			{
				const n = clampN(num(s, ctl, b.n), 0, 100);
				for (let i = 0; i < n; i++) yield* interp(b.body ?? [], s, ctl);
				break;
			}
			case "until":
				for (let i = 0; i < 200; i++)
				{
					if (testCond(s, ctl, b)) break;
					const y0 = ctl.yields;
					yield* interp(b.body ?? [], s, ctl);
					if (ctl.yields === y0) break;
				}
				break;
			case "forever":
				for (let i = 0; i < 400; i++)
				{
					const y0 = ctl.yields;
					yield* interp(b.body ?? [], s, ctl);
					if (ctl.yields === y0) break;
				}
				break;
			case "if":
				if (testCond(s, ctl, b)) yield* interp(b.body ?? [], s, ctl);
				else yield* interp(b.else ?? [], s, ctl);
				break;
			case "set":
				if (b.v) ctl.vars[b.v] = clampN(num(s, ctl, b.n), -999, 999);
				break;
			case "change":
				if (b.v) ctl.vars[b.v] = clampN((ctl.vars[b.v] ?? 0) + num(s, ctl, b.n), -999, 999);
				break;
			case "start":
				break; // the hat block: does nothing
			case "define":
				break; // a spell definition only runs when cast
			case "cast":
			{
				const body = ctl.defs[b.name ?? "Blaze"];
				if (body && ctl.depth < 12)
				{
					ctl.depth++;
					yield* interp(body, s, ctl);
					ctl.depth--;
				}
				break;
			}
			case "firespin":
				yield {
					act: "spinup",
					id: b.id,
				};
				yield {
					act: "spin",
					id: b.id,
				};
				break;
			case "takeoff":
			case "land":
			case "left":
			case "right":
			case "around":
			case "attack":
			case "whip":
			case "gust":
			case "roar":
			case "curl":
			case "wait":
				yield {
					act: b.type,
					id: b.id,
				};
		}
	}
}

export interface StepResult
{
	events: GameEvent[];
	blockId: string | null;
	act: Action | null;
}
export interface Run
{
	s: State;
	vars: Record<string, number>;
	step: () => StepResult | null;
}

export function createRun(L: Level, program: Block[]): Run
{
	const defs: Record<string, Block[]> = {};
	(function walk(list: Block[]): void
	{
		for (const b of list)
		{
			if (b.type === "define" && !defs[b.name ?? "Blaze"]) defs[b.name ?? "Blaze"] = b.body ?? [];
			if (b.body) walk(b.body);
			if (b.else) walk(b.else);
		}
	})(program);
	const s = makeState(L),
		ctl: Control =
		{
			cancel: false,
			yields: 0,
			vars: {},
			defs,
			depth: 0,
		},
		gen = interp(program, s, ctl);
	let done = false;
	return {
		s,
		vars: ctl.vars,
		step()
		{
			if (s.over) return null;
			let next: Yielded =
			{
				act: "wait",
				id: null,
			};
			const nx = done ? null : gen.next();
			if (nx && !nx.done) next = nx.value;
			else
			{
				done = true;
				if (!s.balls.length)
				{
					s.over = "nocode";
					return {
						events: [],
						blockId: null,
						act: null,
					};
				}
				// let fireballs in flight finish
			}
			ctl.yields++;
			const ev: GameEvent[] = [];
			const r = tickWith(s, next.act, ev);
			if (r?.cancel) ctl.cancel = true;
			return {
				events: ev,
				blockId: next.id,
				act: next.act,
			};
		},
	};
}

function key(s: State): string
{
	const D = s.dragon;
	let k =
		`${D.x},${D.y},${D.d},${D.fly ? 1 : 0},${D.hp},${D.ammo}` +
		(s.balls.length ? `@${s.balls.map((b) => `${b.x},${b.y},${b.d},${b.dist}`).join(";")}` : "");
	for (const n of s.knights)
		k += n.alive
			? `|${n.x},${n.y},${n.d},${n.pc},${n.hp}${n.shield ? "s" : ""}${n.stun ? `z${n.stun}` : ""}`
			: "|x";
	return `${k}#${s.tiles.join("")}`;
}
const ALL_ACTS: Action[] = [
	"step",
	"left",
	"right",
	"around",
	"attack",
	"whip",
	"fireball",
	"takeoff",
	"land",
	"wait",
	"gust",
	"roar",
	"firespin",
	"curl",
];
function heur(s: State): number
{
	const D = s.dragon;
	let alive = 0,
		md = 99;
	for (const k of s.knights)
		if (k.alive)
		{
			alive += k.hp;
			const m = Math.abs(k.x - D.x) + Math.abs(k.y - D.y);
			if (m < md) md = m;
		}
	return alive * 10 + (alive ? md : 0) + (3 - D.hp) * 3;
}
// weighted best-first search: fast existence check, near-short solutions
export function solve(L: Level, maxStates = 40000, needFull = false, weight = 2, acts = ALL_ACTS): Action[] | null
{
	const start = makeState(L);
	const states = [start],
		parent = [-1],
		pact: (Action | null)[] = [null],
		g = [0];
	const seen = new Set([key(start)]);
	const heap: [number, number][] = [];
	const push = (f: number, i: number): void =>
	{
		heap.push([f, i]);
		let c = heap.length - 1;
		while (c > 0)
		{
			const p = (c - 1) >> 1;
			if (heap[p]![0] <= heap[c]![0]) break;
			[heap[p], heap[c]] = [heap[c]!, heap[p]!];
			c = p;
		}
	};
	const pop = (): [number, number] =>
	{
		const top = heap[0]!;
		const last = heap.pop()!;
		if (heap.length)
		{
			heap[0] = last;
			let c = 0;
			for (;;)
			{
				const l = 2 * c + 1,
					r = l + 1;
				let m = c;
				if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
				if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
				if (m === c) break;
				[heap[m], heap[c]] = [heap[c]!, heap[m]!];
				c = m;
			}
		}
		return top;
	};
	push(0, 0);
	while (heap.length)
	{
		const qi = pop()[1];
		const s = states[qi]!;
		for (const a of acts)
		{
			if (a === "takeoff" && s.dragon.fly) continue;
			if (a === "land" && !s.dragon.fly) continue;
			if ((a === "attack" || a === "whip" || a === "fireball" || a === "firespin") && s.dragon.fly) continue;
			if (a === "fireball" && s.dragon.ammo <= 0) continue;
			const ns = cloneState(s);
			const ev: GameEvent[] = [];
			if (a === "fireball")
			{
				tickWith(ns, "charge", ev);
				if (!ns.over) tickWith(ns, "fireball", ev);
			}
			else if (a === "firespin")
			{
				tickWith(ns, "spinup", ev);
				if (!ns.over) tickWith(ns, "spin", ev);
			}
			else tickWith(ns, a, ev);
			if (ns.over === "win")
			{
				const path = [a];
				let p = qi;
				while (p > 0)
				{
					path.push(pact[p]!);
					p = parent[p]!;
				}
				return path.toReversed();
			}
			if (ns.over) continue;
			if (needFull && ns.dragon.hp < 3) continue;
			const kk = key(ns);
			if (seen.has(kk)) continue;
			seen.add(kk);
			states.push(ns);
			parent.push(qi);
			pact.push(a);
			g.push(g[qi]! + (a === "fireball" || a === "firespin" ? 2 : 1));
			push(g[states.length - 1]! + weight * heur(ns), states.length - 1);
			if (states.length > maxStates) return null;
		}
	}
	return null;
}

// turn a primitive action list into blocks
let uid = 1;
function nid(): string
{
	return `b${Date.now() % 100000}_${uid++}`;
}
export function actionsToBlocks(acts: Action[]): Block[]
{
	const out: Block[] = [];
	let fly = false;
	for (let i = 0; i < acts.length; i++)
	{
		const a = acts[i]!;
		if (a === "step")
		{
			let n = 1;
			while (acts[i + 1] === "step")
			{
				n++;
				i++;
			}
			out.push(
				{
					id: nid(),
					type: fly ? "fly" : "move",
					n,
				},
			);
			continue;
		}
		if (a === "takeoff") fly = true;
		if (a === "land") fly = false;
		out.push(
			{
				id: nid(),
				// The solver's actions are all block types; charge, spinup, spin and flyfail never come out of it.
				type: BLOCK_TYPES.find((t) => t === a)!,
			},
		);
	}
	const res: Block[] = [];
	for (const b of out)
	{
		if ((b.type === "move" || b.type === "fly") && typeof b.n === "number" && b.n > 20)
		{
			let n = b.n;
			res.push(
				{
					...b,
					n: 20,
				},
			);
			n -= 20;
			while (n > 0)
			{
				res.push(
					{
						id: nid(),
						type: "move",
						n: Math.min(20, n),
					},
				);
				n -= 20;
			}
		}
		else res.push(b);
	}
	return res;
}
const sig = (b: Block): string =>
	b.type + (b.n === undefined ? "" : `:${JSON.stringify(b.n)}`) + (b.body ? `[${b.body.map(sig).join(",")}]` : "");
export function countBlocks(list: Block[]): number
{
	let n = 0;
	for (const b of list)
	{
		n++;
		if (b.body) n += countBlocks(b.body);
		if (b.else) n += countBlocks(b.else);
	}
	return n;
}
// squeeze a block list with Repeat blocks (an achievable "crown" target)
function compressBlocks(input: Block[]): Block[]
{
	const list = input.slice();
	for (let guard = 0; guard < 50; guard++)
	{
		let best:
		{
			i: number;
			L: number;
			k: number;
			save: number;
		} | null = null;
		const sg = list.map(sig);
		for (let L = 1; L <= 6; L++)
			for (let i = 0; i + L * 2 <= list.length; i++)
			{
				let k = 1;
				const pat = sg.slice(i, i + L).join("|");
				while (i + L * (k + 1) <= list.length && sg.slice(i + L * k, i + L * (k + 1)).join("|") === pat) k++;
				if (k < 2) continue;
				k = Math.min(k, 20);
				const bodyCost = countBlocks(list.slice(i, i + L));
				const save = bodyCost * k - (bodyCost + 1);
				if (save > 0 && (!best || save > best.save))
					best =
					{
						i,
						L,
						k,
						save,
					};
			}
		if (!best) break;
		const body = list.slice(best.i, best.i + best.L);
		list.splice(
			best.i,
			best.L * best.k,
			{
				id: nid(),
				type: "repeat",
				n: best.k,
				body,
			},
		);
	}
	return list;
}
function crownFor(sol: Action[]): number
{
	return countBlocks(compressBlocks(actionsToBlocks(sol))) + 1;
} // +1 for the When start block

function rng(seed: number): () => number
{
	let a = seed >>> 0;
	return function (): number
	{
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const PROG_TEMPLATES: ((r: () => number) => string)[] = [
	() => "W",
	() => "G",
	() => "RG",
	() => "LG",
	() => "FFU",
	() => "FU",
	() => "FFFU",
	() => "FR",
	() => "FL",
	() => "FFU",
	() => "FAU",
	() => "FGFU",
	() => "GGR",
	() => "FWU",
	() => "AR",
	() => "FFLL",
	() => "GW",
	() => "FGR",
	(r) =>
	{
		let s = "";
		const n = 2 + Math.floor(r() * 4);
		const ops = "FFLRAWG";
		for (let i = 0; i < n; i++) s += ops[Math.floor(r() * ops.length)]!;
		return s;
	},
];
const REACTIVE = ["TG", "TGW", "CG", "CW", "TFG", "TGGF", "CWA", "TA", "TWG", "FTG"];
const pickOf = <T>(R: () => number, list: readonly T[]): T => list[Math.floor(R() * list.length)]!;

function generateCandidate(
	d: number,
	R: () => number,
	opts:
	{
		feature?: KnightType;
	},
): Level | null
{
	const w = 6 + Math.min(4, Math.floor(d / 5)),
		h = 6 + Math.min(3, Math.floor(d / 7));
	const t = Array.from(
		{
			length: w * h,
		},
		() => ".",
	);
	const pick = (): Cell => [Math.floor(R() * w), Math.floor(R() * h)];
	const nWall = Math.floor(w * h * (0.05 + R() * 0.1));
	for (let i = 0; i < nWall;)
	{
		let [x, y] = pick();
		const dir = Math.floor(R() * 4);
		const len = 1 + Math.floor(R() * 3);
		for (let j = 0; j < len && i < nWall; j++)
		{
			if (x >= 0 && y >= 0 && x < w && y < h)
			{
				t[y * w + x] = "#";
				i++;
			}
			x += DX[dir]!;
			y += DY[dir]!;
		}
	}
	if (d >= 2 && R() < 0.7)
	{
		if (R() < 0.5)
		{
			const vert = R() < 0.5;
			const at = 1 + Math.floor(R() * ((vert ? w : h) - 2));
			const gap = Math.floor(R() * (vert ? h : w));
			for (let i = 0; i < (vert ? h : w); i++)
			{
				if (i === gap && R() < 0.6) continue;
				const x = vert ? at : i,
					y = vert ? i : at;
				t[y * w + x] = "~";
			}
		}
		else
		{
			const [cx, cy] = pick();
			for (let yy = cy - 1; yy <= cy + 1; yy++)
				for (let xx = cx - 1; xx <= cx; xx++)
					if (xx >= 0 && yy >= 0 && xx < w && yy < h && R() < 0.85) t[yy * w + xx] = "~";
		}
	}
	const nTree = Math.floor(R() * 5);
	for (let i = 0; i < nTree; i++)
	{
		const [x, y] = pick();
		if (t[y * w + x] === ".") t[y * w + x] = "T";
	}
	const empty = (): Cell | null =>
	{
		for (let g = 0; g < 200; g++)
		{
			const [x, y] = pick();
			if (t[y * w + x] === ".") return [x, y];
		}
		return null;
	};
	const dp = empty();
	if (!dp) return null;
	t[dp[1] * w + dp[0]] = "D";
	if (d >= 4 && R() < 0.45)
	{
		const taco = empty();
		if (taco) t[taco[1] * w + taco[0]] = "t";
	}
	const pool: KnightType[] = ["soldier"];
	if (d >= 2) pool.push("shield", "shield");
	if (d >= 4) pool.push("archer");
	if (d >= 6) pool.push("rider");
	if (d >= 8) pool.push("spearman", "spearman");
	if (d >= 10) pool.push("paladin", "paladin");
	const nk = Math.min(7, 1 + Math.floor(d / 3) + (R() < 0.3 ? 1 : 0));
	const reactP = d >= 7 ? Math.min(0.45, (d - 6) * 0.04) : 0;
	const knights: KnightSpec[] = [];
	for (let i = 0; i < nk; i++)
	{
		let p: Cell | null = null;
		for (let g = 0; g < 100; g++)
		{
			const q = empty();
			if (!q) break;
			if (
				Math.abs(q[0] - dp[0]) + Math.abs(q[1] - dp[1]) >= 3 &&
				!knights.some((k) => k.x === q[0] && k.y === q[1])
			)
			{
				p = q;
				break;
			}
		}
		if (!p) return null;
		let type = pickOf(R, pool);
		if (i === 0 && opts.feature) type = opts.feature;
		let prog = R() < reactP ? pickOf(R, REACTIVE) : pickOf(R, PROG_TEMPLATES)(R);
		if (type === "archer")
			prog =
				R() < reactP ? pickOf(R, ["TA", "TGG", "TWA"]) : pickOf(R, ["A", "GR", "AR", "GL", "G", "FAUA", "AAR"]);
		knights.push(
			{
				type,
				x: p[0],
				y: p[1],
				d: Math.floor(R() * 4),
				prog,
			},
		);
	}
	t[dp[1] * w + dp[0]] = ".";
	const map: string[] = [];
	for (let y = 0; y < h; y++) map.push(t.slice(y * w, y * w + w).join(""));
	return {
		w,
		h,
		map,
		dragon:
		{
			x: dp[0],
			y: dp[1],
			d: Math.floor(R() * 4),
		},
		knights,
	};
}

export function generate(
	d: number,
	seed: number,
	maxStates = 25000,
	opts:
	{
		feature?: KnightType;
	} = {},
): Level | null
{
	const R = rng(seed);
	for (let tries = 0; tries < 60; tries++)
	{
		const L = generateCandidate(d, R, opts);
		if (!L) continue;
		const sol = solve(L, maxStates);
		if (!sol) continue;
		const minLen = Math.min(28, 5 + d);
		if (sol.length < minLen) continue;
		L.solution = sol;
		L.diff = d;
		L.crown = crownFor(sol);
		return L;
	}
	return null;
}

// A wave for the Endless Siege: the first of up to 25 seeds that generates a level, each searched with max states.
export function generateWave(d: number, seed: number, max: number): Level | null
{
	let r: Level | null = null;
	for (let k = 0; k < 25 && !r; k++) r = generate(d, seed + k * 977, max);
	return r;
}

export function knightCodeText(k: KnightSpec): string[]
{
	const t = k.type;
	const names: Record<string, string> =
	{
		F: t === "rider" ? "charge()  // 2 squares" : "forward()",
		L: "turnLeft()",
		R: "turnRight()",
		U: "turnAround()",
		A: t === "archer" ? "shootArrow()" : t === "spearman" ? "throwSpear()  // 2 squares" : "attack()",
		W: "wait()",
		G:
			t === "archer"
				? "if (flyingDragonInRange) shootArrow()"
				: t === "spearman"
					? "if (dragonWithin2) throwSpear()"
					: "if (dragonAhead) attack()",
		T: "faceDragon()",
		C: "faceDragon(); forward()",
	};
	return k.prog.split("").map((c) => names[c]!);
}
