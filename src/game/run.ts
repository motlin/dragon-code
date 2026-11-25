import {ensureStart, reId, renderBlockEl, renderPalette, renderWS, saveProg, updateMonitor} from "./blocks.ts";
import {$, $$, el} from "./dom.ts";
import {burst, floatText, handleEvents} from "./effects.ts";
import
{
	actionsToBlocks,
	type Block,
	cloneState,
	countBlocks,
	createRun,
	DX,
	DY,
	type Level,
	makeState,
	MAXT,
	type Over,
	type State,
	type StepResult,
} from "./engine.ts";
import {renderHearts, startHp, starsFor, updateHud} from "./hud.ts";
import {renderKnights} from "./knights.ts";
import {LEVELS} from "./levels.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {show} from "./screens.ts";
import {solveInWorker, stripLevel} from "./solver.ts";
import {audio, sfx} from "./sound.ts";
import {fx, hooks, play, type PlayContext, progCache, SPEEDS} from "./state.ts";
import {dname, dnameOr, prefs, progress, saveProgress} from "./store.ts";
import {ALL_BLOCKS, unlockedBlocks} from "./unlocks.ts";

// Playing a level: starting it, running the spell a step at a time with its animation, and the win and fail dialogs.

export function startLevel(L: Level, c: PlayContext): void
{
	stopRun(true);
	play.level = L;
	play.ctx = c;
	c.attempts = 0;
	play.prog = (c.key ? progCache[c.key] : undefined) ?? [];
	ensureStart();
	$("#play-title").textContent = c.title;
	const story = $("#story");
	if (L.intro)
	{
		story.innerHTML = "";
		story.appendChild(el("b", null, `${L.name}. `));
		story.appendChild(document.createTextNode(L.intro));
		story.classList.remove("hidden");
	}
	else
	{
		story.innerHTML = "";
		const n = L.knights.length;
		story.appendChild(el("b", null, "Goal: "));
		story.appendChild(
			document.createTextNode(
				`${n > 1 ? `Burn all ${n} knights` : "Burn the knight"}. Read the knights' code, plan your spell, then press Run.`,
			),
		);
		story.classList.remove("hidden");
	}
	const x = el("button", "x", "×");
	x.setAttribute("aria-label", "Hide story");
	x.addEventListener("click", (): void =>
	{
		story.classList.add("hidden");
	});
	story.appendChild(x);
	resetBoardState();
	$("#book-title").textContent = dname() ? `${dname()}'s spellbook` : "Your spellbook";
	renderPalette();
	renderWS();
	renderKnights();
	updateHud();
	renderHearts(startHp());
	$("#speed").textContent = ["Speed 1x", "Speed 2x", "Speed 4x"][prefs.speedIdx]!;
	show("play");
}
function resetBoardState(): void
{
	const s = makeState(play.level!);
	play.prevS = s;
	play.currS = cloneState(s);
	play.animT0 = 0;
	play.lastVars = {};
	updateMonitor();
	fx.effects = [];
	fx.particles = [];
	fx.floats = [];
	fx.scorches = [];
}

/* ---------------- RUN ---------------- */
export function startRun(): void
{
	if (play.running) return;
	const level = play.level!;
	ensureStart();
	if (play.prog.length < 2)
	{
		floatText("Add some blocks under When spell run!", level.dragon.x, level.dragon.y, "#c4432a");
		return;
	}
	audio();
	play.ctx!.attempts++;
	resetBoardState();
	play.runner = createRun(level, play.prog);
	play.running = true;
	$("#col-code").classList.add("locked");
	runButtons(true);
	updateHud();
	renderHearts(startHp());
	play.tickTimer = setTimeout(doTick, 150);
}
function runButtons(running: boolean): void
{
	$("#btn-run").toggleAttribute("disabled", running);
	$("#btn-stop").toggleAttribute("disabled", !running);
}
export function stopRun(silent: boolean): void
{
	clearTimeout(play.tickTimer);
	play.tickTimer = undefined;
	play.running = false;
	play.runner = null;
	$("#col-code").classList.remove("locked");
	$$(".blk.running").forEach((n) =>
	{
		n.classList.remove("running");
	});
	runButtons(false);
	if (!silent && play.level)
	{
		resetBoardState();
		renderHearts(startHp());
		renderKnights();
	}
}
function doTick(): void
{
	const runner = play.runner;
	if (!runner) return;
	const before = cloneState(runner.s);
	const r = runner.step();
	const after = cloneState(runner.s);
	play.lastVars =
	{
		...runner.vars,
	};
	updateMonitor();
	$$(".blk.running").forEach((n) =>
	{
		n.classList.remove("running");
	});
	if (r?.blockId)
	{
		const b = document.querySelector<HTMLElement>(`#ws .blk[data-id="${r.blockId}"]`);
		if (b)
		{
			b.classList.add("running");
			scrollIntoViewIfNeeded(b);
		}
	}
	const te = r?.events.find((e) => e.t === "taco");
	if (r && te?.t === "taco")
	{
		playTacoTick(before, after, r, te);
		return;
	}
	play.prevS = before;
	play.currS = after;
	play.animT0 = performance.now();
	if (r) handleEvents(r.events, r.act);
	renderKnights();
	afterTick(SPEEDS[prefs.speedIdx]!);
}
function afterTick(delay: number): void
{
	const runner = play.runner;
	if (!runner) return;
	const over = runner.s.over;
	if (over)
	{
		const st = runner.s;
		play.running = false;
		play.tickTimer = setTimeout(
			() =>
			{
				finishRun(over, st);
			},
			over === "nocode" ? 200 : delay + 500,
		);
	}
	else play.tickTimer = setTimeout(doTick, delay);
}
// Taco: 1) walk/land onto the taco, 2) stop and chomp it, 3) blast + get launched back
function playTacoTick(
	before: State,
	after: State,
	r: StepResult,
	te:
	{
		x: number;
		y: number;
	},
): void
{
	const sp = SPEEDS[prefs.speedIdx]!;
	const mid = cloneState(before);
	mid.dragon.x = te.x;
	mid.dragon.y = te.y;
	mid.dragon.fly = false;
	play.prevS = before;
	play.currS = mid;
	play.animT0 = performance.now();
	if (r.act === "step") sfx("step");
	else sfx("flap");
	play.tickTimer = setTimeout(() =>
	{
		if (!play.runner) return;
		const eat = cloneState(mid);
		eat.tiles[te.y * eat.w + te.x] = ".";
		play.prevS = eat;
		play.currS = eat;
		play.animT0 = 0;
		const dur = Math.max(700, sp * 1.4);
		const D = eat.dragon,
			mx = D.x + 0.5 + DX[D.d]! * 0.42,
			my = D.y + 0.5 + DY[D.d]! * 0.42;
		fx.effects.push(
			{
				t: "chomp",
				x: te.x,
				y: te.y,
				d: D.d,
				t0: performance.now(),
				dur,
			},
		);
		burst(
			mx,
			my,
			30,
			{
				kind: "crumb",
				speed: 0.9,
				life: 0.45,
				size: 0.05,
				delay: (dur / 1000) * 0.8,
			},
		);
		sfx("chomp");
		floatText("Nom nom nom!", te.x, te.y, "#c4432a");
		play.tickTimer = setTimeout(() =>
		{
			if (!play.runner) return;
			play.prevS = eat;
			play.currS = after;
			play.animT0 = performance.now();
			handleEvents(
				r.events.filter((e) => e.t !== "taco"),
				null,
			);
			renderKnights();
			afterTick(Math.max(sp, 500));
		}, dur);
	}, sp * 0.9);
}
function scrollIntoViewIfNeeded(b: HTMLElement): void
{
	const ws = $("#ws");
	const r = b.getBoundingClientRect(),
		w = ws.getBoundingClientRect();
	if (r.top < w.top || r.bottom > w.bottom) ws.scrollTop += r.top - w.top - w.height / 3;
}
function finishRun(over: Over, st: State): void
{
	play.runner = null;
	$("#col-code").classList.remove("locked");
	runButtons(false);
	$$(".blk.running").forEach((n) =>
	{
		n.classList.remove("running");
	});
	if (over === "win")
	{
		sfx("win");
		onWin();
	}
	else
	{
		sfx("lose");
		const left = st.knights.filter((k) => k.alive).length;
		const why =
		{
			lose: `The knights got ${dnameOr("you")}! ${dnameOr("Your dragon")} ran out of hearts.`,
			nocode: `Your spell ended, but ${left} knight${left > 1 ? "s are" : " is"} still standing.`,
			timeout: `Your spell ran for too long (${MAXT} steps).`,
		}[over];
		onFail(why);
	}
}
function onWin(): void
{
	const ctx = play.ctx!,
		level = play.level!;
	if (ctx.mode === "endless")
	{
		hooks.endlessWin();
		return;
	}
	if (ctx.mode === "test")
	{
		hooks.testBeaten();
		modal((c) =>
		{
			c.appendChild(el("h2", null, dname() ? `${dname()} beat your level!` : "You beat your own level!"));
			c.appendChild(el("p", null, "Now you can publish it to the gallery for others to play."));
			const row = el("div", "row");
			mBtn(row, "Back to the forge", "fire", () =>
			{
				closeModal();
				hooks.openEditor();
			});
			c.appendChild(row);
		});
		return;
	}
	const stars = starsFor(ctx.attempts);
	const nb = countBlocks(play.prog),
		crown = !!(level.crown && nb <= level.crown);
	const before = ctx.mode === "campaign" ? unlockedBlocks() : null;
	if (ctx.mode === "campaign")
	{
		const nm = LEVELS[ctx.index!]!.name!;
		progress.stars[nm] = Math.max(progress.stars[nm] ?? 0, stars);
		if (crown) progress.crowns[nm] = true;
	}
	if (ctx.mode === "gallery")
	{
		const id = ctx.galleryId!;
		progress.gallery[id] = Math.max(progress.gallery[id] ?? 0, stars);
	}
	saveProgress();
	const fresh = before ? ALL_BLOCKS.filter((b) => unlockedBlocks().has(b) && !before.has(b)) : [];
	modal((c) =>
	{
		c.appendChild(el("h2", null, dname() ? `${dname()} wins!` : "Victory!"));
		const s = el("div", "bigstars");
		for (let i = 0; i < 3; i++)
		{
			const sp = el("span", i < stars ? "" : "off", "★");
			s.appendChild(sp);
		}
		c.appendChild(s);
		c.appendChild(
			el(
				"p",
				null,
				ctx.attempts === 1
					? `Perfect! ${dnameOr("You")} burned every knight on the first try.`
					: `${dnameOr("You")} won in ${ctx.attempts} attempts. Win on the first try for 3 stars.`,
			),
		);
		if (level.crown)
		{
			const cp = el("p", `crownline${crown ? " got" : ""}`);
			cp.textContent = crown
				? `♛ Crown earned! You used just ${nb} blocks.`
				: `Your spell used ${nb} blocks. Get it down to ${level.crown} or fewer for the crown ♛${ctx.mode === "campaign" && unlockedBlocks().size < ALL_BLOCKS.length ? " Blocks you unlock later can help, so come back and try again!" : ""}`;
			c.appendChild(cp);
		}
		if (fresh.length)
		{
			const box = el("div", "unlockbox");
			box.appendChild(el("div", "unlocktitle", "New blocks unlocked!"));
			const row = el("div", "unlockrow");
			fresh.forEach((t) =>
				row.appendChild(
					renderBlockEl(
						{
							id: "",
							type: t,
						},
						true,
					),
				),
			);
			box.appendChild(row);
			box.appendChild(
				el("p", "unlocknote", "You can now use them on every level, including the ones you already beat."),
			);
			c.appendChild(box);
			sfx("taco");
		}
		const row = el("div", "row");
		if (ctx.mode === "campaign" && ctx.index! + 1 < LEVELS.length)
			mBtn(row, "Next level", "fire", () =>
			{
				closeModal();
				hooks.playCampaign(ctx.index! + 1);
			});
		mBtn(row, "Play again", "", () =>
		{
			closeModal();
			startLevel(
				level,
				{
					...ctx,
				},
			);
		});
		mBtn(row, ctx.mode === "gallery" ? "Gallery" : "Map", "", () =>
		{
			closeModal();
			if (ctx.mode === "gallery") void hooks.openGallery();
			else hooks.openMap();
		});
		c.appendChild(row);
	});
}
function onFail(why: string): void
{
	const ctx = play.ctx!;
	if (ctx.mode === "endless")
	{
		hooks.endlessFail(why);
		return;
	}
	modal((c) =>
	{
		c.appendChild(el("h2", null, "Not quite!"));
		c.appendChild(el("p", null, why));
		c.appendChild(el("p", null, "Study the knights' code, fix your spell, and try again."));
		const row = el("div", "row");
		mBtn(row, "Fix my spell", "fire", () =>
		{
			closeModal();
			fixSpell();
		});
		if (ctx.attempts >= 3)
			mBtn(row, "Get a hint", "", async () =>
			{
				closeModal();
				await showHint();
			});
		c.appendChild(row);
	});
	updateHud();
}
// Puts the board back to the start, after a failed run, so the spell can be changed.
export function fixSpell(): void
{
	resetBoardState();
	renderHearts(startHp());
	renderKnights();
}

/* ---------------- HINTS ---------------- */
export async function showHint(): Promise<void>
{
	const level = play.level!;
	let sol = level.solution ?? null;
	if (!sol)
	{
		modal((c) =>
		{
			c.appendChild(el("h2", null, "The wizard is thinking..."));
			c.appendChild(el("p", null, "Searching for a winning spell."));
		});
		sol = await solveInWorker(stripLevel(level));
		if (sol) level.solution = sol;
	}
	if (!sol)
	{
		modal((c) =>
		{
			c.appendChild(el("h2", null, "No hint found"));
			c.appendChild(el("p", null, "The wizard could not find a solution in time. This one is tricky!"));
			const r = el("div", "row");
			mBtn(r, "OK", "fire", closeModal);
			c.appendChild(r);
		});
		return;
	}
	const blocks = actionsToBlocks(sol);
	let showAll = false;
	const build = (c: HTMLElement): void =>
	{
		c.innerHTML = "";
		c.appendChild(el("h2", null, "A hint from the wizard"));
		c.appendChild(el("p", null, showAll ? "Here is one spell that wins:" : "Here is how a winning spell begins:"));
		const box = el("div", "hint-blocks");
		const shown: Block[] = [
			{
				id: "h",
				type: "start",
			},
			...(showAll ? blocks : blocks.slice(0, 3)),
		];
		shown.forEach((b) =>
		{
			const e = renderBlockEl(b, false);
			e.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>("select,button,input").forEach(
				(x) =>
				{
					x.disabled = true;
				},
			);
			box.appendChild(e);
		});
		if (!showAll && blocks.length > 3)
			box.appendChild(el("span", "kloop", `...and ${blocks.length - 3} more blocks`));
		c.appendChild(box);
		const row = el("div", "row");
		if (!showAll)
			mBtn(row, "Show the whole spell", "", () =>
			{
				showAll = true;
				build(c);
			});
		mBtn(row, "Use this spell", "fire", () =>
		{
			play.prog = reId(showAll ? blocks : blocks.slice(0, 3));
			ensureStart();
			saveProg();
			renderWS();
			closeModal();
		});
		mBtn(row, "Close", "", closeModal);
		c.appendChild(row);
	};
	modal(build);
}
