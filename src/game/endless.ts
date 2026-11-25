import {submitScore} from "./api.ts";
import {el} from "./dom.ts";
import {updateBestLine} from "./home.ts";
import {updateHud} from "./hud.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {fixSpell, startLevel, stopRun} from "./run.ts";
import {show} from "./screens.ts";
import {generateInWorker} from "./solver.ts";
import {hooks, play} from "./state.ts";
import {dname, prefs, progress, saveProgress} from "./store.ts";

// The Endless Siege: generated waves that grow harder, three dragon eggs to lose, and a best score.
let endless:
{
	wave: number;
	eggs: number;
	seed: number;
} =
{
	wave: 1,
	eggs: 3,
	seed: 0,
};
export async function startEndless(): Promise<void>
{
	endless =
	{
		wave: 1,
		eggs: 3,
		seed: Math.floor(Math.random() * 1e9),
	};
	await nextWave();
}
async function nextWave(): Promise<void>
{
	stopRun(true);
	modal((c) =>
	{
		c.appendChild(el("h2", null, `Wave ${endless.wave}`));
		c.appendChild(el("p", null, "The next wave of knights is marching in..."));
	});
	const d = Math.min(20, 1 + endless.wave);
	const L = await generateInWorker(d, endless.seed + endless.wave * 7919);
	if (!L)
	{
		modal((c) =>
		{
			c.appendChild(el("h2", null, "The knights got lost"));
			c.appendChild(el("p", null, "Could not build this wave. Try again."));
			const r = el("div", "row");
			mBtn(r, "Try again", "fire", nextWave);
			mBtn(r, "Home", "", () =>
			{
				closeModal();
				show("home");
			});
			c.appendChild(r);
		});
		return;
	}
	L.name = `Wave ${endless.wave}`;
	closeModal();
	startLevel(
		L,
		{
			mode: "endless",
			key: null,
			wave: endless.wave,
			eggs: endless.eggs,
			title: `Endless Siege · Wave ${endless.wave}`,
			attempts: 0,
		},
	);
}
export function endlessWin(): void
{
	const cleared = endless.wave;
	modal((c) =>
	{
		c.appendChild(el("h2", null, dname() ? `${dname()} burned wave ${cleared}!` : `Wave ${cleared} burned!`));
		c.appendChild(el("p", null, "More knights are coming. Your hearts are restored."));
		const r = el("div", "row");
		mBtn(r, "Next wave", "fire", async () =>
		{
			endless.wave++;
			await nextWave();
		});
		c.appendChild(r);
	});
}
export function endlessFail(why: string): void
{
	endless.eggs--;
	play.ctx!.eggs = endless.eggs;
	updateHud();
	if (endless.eggs > 0)
	{
		modal((c) =>
		{
			c.appendChild(el("h2", null, "You lost a dragon egg"));
			c.appendChild(el("p", null, why));
			c.appendChild(el("p", null, `Eggs left: ${endless.eggs}. Fix your spell and try this wave again.`));
			const r = el("div", "row");
			mBtn(r, "Fix my spell", "fire", () =>
			{
				closeModal();
				fixSpell();
			});
			c.appendChild(r);
		});
	}
	else
	{
		const score = endless.wave - 1;
		const best = progress.endlessBest;
		const isBest = score > best;
		if (isBest)
		{
			progress.endlessBest = score;
			saveProgress();
		}
		updateBestLine();
		if (score > 0)
			submitScore(
				{
					best: score,
					nick: prefs.nick.slice(0, 24),
				},
			).catch(() =>
			{
				// The best stays on this device; the Hall of Flames misses this one.
			});
		modal((c) =>
		{
			c.appendChild(el("h2", null, dname() ? `${dname()}'s siege is over` : "The siege is over"));
			c.appendChild(el("p", null, why));
			const s = el("div", "bigstars", String(score));
			c.appendChild(s);
			c.appendChild(
				el(
					"p",
					null,
					`${score === 1 ? "1 wave" : `${score} waves`} burned.${isBest ? " A new personal best!" : ` Your best is ${best}.`}`,
				),
			);
			const r = el("div", "row");
			mBtn(r, "Play again", "fire", async () =>
			{
				closeModal();
				await startEndless();
			});
			mBtn(r, "Hall of Flames", "", async () =>
			{
				closeModal();
				await hooks.openGallery();
			});
			mBtn(r, "Home", "", () =>
			{
				closeModal();
				show("home");
			});
			c.appendChild(r);
		});
	}
}
