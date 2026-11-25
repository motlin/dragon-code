import type {Block, Level, Run, State} from "./engine.ts";

// The state the screens share: the spell being written, the level being played and its run, the animation between
// two steps, and the effects drawn on the board.

export type Mode = "campaign" | "endless" | "test" | "gallery";
export interface PlayContext
{
	mode: Mode;
	key: string | null;
	title: string;
	attempts: number;
	index?: number;
	wave?: number;
	eggs?: number;
	galleryId?: string;
}

export type Effect =
{
	t0: number;
	dur: number;
} & (
	|
	  {
			t: "glow" | "stab" | "roar" | "spinup";
			x: number;
			y: number;
	  }
	|
	  {
			t: "whip" | "gust" | "charge" | "chomp";
			x: number;
			y: number;
			d: number;
	  }
	|
	  {
			t: "blast";
			x: number;
			y: number;
			d: number;
			n: number;
	  }
	|
	  {
			t: "arrow" | "fbgone";
			x0: number;
			y0: number;
			x1: number;
			y1: number;
	  }
	|
	  {
			t: "spear";
			id: number;
			x0: number;
			y0: number;
			x1: number;
			y1: number;
	  }
);

export interface Particle
{
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	kind: string;
	c?: string;
	size: number;
	delay: number;
}

export interface Float
{
	text: string;
	x: number;
	y: number;
	t0: number;
	color: string;
}

export const SPEEDS = [600, 320, 160];
export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const play:
{
	prog: Block[];
	ctx: PlayContext | null;
	level: Level | null;
	runner: Run | null;
	running: boolean;
	tickTimer: ReturnType<typeof setTimeout> | undefined;
	prevS: State | null;
	currS: State | null;
	animT0: number;
	hoverKnight: number;
	lastVars: Record<string, number>;
} =
{
	prog: [],
	ctx: null,
	level: null,
	runner: null,
	running: false,
	tickTimer: undefined,
	prevS: null,
	currS: null,
	animT0: 0,
	hoverKnight: -1,
	lastVars: {},
};
// Each level's spell, kept while the page is open.
export const progCache: Record<string, Block[]> = {};

export const fx:
{
	effects: Effect[];
	particles: Particle[];
	floats: Float[];
	scorches:
	{
		x: number;
		y: number;
	}[];
	shakeUntil: number;
	hitFlashUntil: number;
} =
{
	effects: [],
	particles: [],
	floats: [],
	scorches: [],
	shakeUntil: 0,
	hitFlashUntil: 0,
};

export const screen =
{
	current: "home",
};

const unset = (): never =>
{
	throw new Error("the screens are not wired up yet");
};
// The screens call each other in circles (a win offers the map, the map starts a level), so the ones lower down reach
// the ones above through these, which src/game/app.ts fills in.
export const hooks:
{
	openMap: () => void;
	openGallery: () => Promise<void>;
	openEditor: () => void;
	playCampaign: (i: number) => void;
	endlessWin: () => void;
	endlessFail: (why: string) => void;
	testBeaten: () => void;
	drawEditor: (now: number) => void;
} =
{
	openMap: unset,
	openGallery: unset,
	openEditor: unset,
	playCampaign: unset,
	endlessWin: unset,
	endlessFail: unset,
	testBeaten: unset,
	drawEditor: unset,
};
