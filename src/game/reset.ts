import {db, dbInit, withTimeout} from "./db.ts";
import {el} from "./dom.ts";
import {updateBestLine} from "./home.ts";
import {openMap} from "./map.ts";
import {closeModal, mBtn, modal, notice} from "./modal.ts";
import {progCache} from "./state.ts";
import {dname, progress, saveProgress} from "./store.ts";

// Starting the campaign over, and forgetting the Endless Siege best.
function confirmReset(title: string, text: string, yesLabel: string, onYes: () => unknown): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, title));
		c.appendChild(el("p", null, text));
		c.appendChild(el("p", null, "This can't be undone."));
		const r = el("div", "row");
		const cb = mBtn(r, "Cancel", "", closeModal);
		cb.dataset["esc"] = "1";
		mBtn(r, yesLabel, "fire", onYes);
		c.appendChild(r);
		setTimeout(() =>
		{
			cb.focus();
		}, 40);
	});
}
export function resetCampaign(): void
{
	confirmReset(
		"Reset the campaign?",
		"All your stars and crowns will be erased, every level after the first will lock again, and you will go back to just the starting blocks. Saved spells for each level are cleared too.",
		"Reset campaign",
		() =>
		{
			progress.stars = {};
			progress.crowns = {};
			saveProgress();
			Object.keys(progCache).forEach((k) =>
			{
				// oxlint-disable-next-line typescript/no-dynamic-delete -- the saved spells are keyed by level
				if (k.startsWith("c")) delete progCache[k];
			});
			closeModal();
			openMap();
			notice(
				"Fresh start!",
				`The campaign is reset. ${dname() ? `${dname()} is` : "Your dragon is"} back at level 1.`,
			);
		},
	);
}
export function resetEndless(): void
{
	confirmReset(
		"Reset your Endless best?",
		`Your best score of ${progress.endlessBest} waves will be erased, and your entry in the Hall of Flames will be removed.`,
		"Reset endless best",
		async () =>
		{
			progress.endlessBest = 0;
			saveProgress();
			updateBestLine();
			let note = "Your Endless best is reset.";
			try
			{
				await dbInit;
				const {DB, MYID} = db;
				if (DB && MYID)
				{
					await withTimeout(DB.doc(`scores/${MYID}`).delete(), 10000);
					note += " Your Hall of Flames entry is gone too.";
				}
			}
			catch
			{
				note += " The Hall of Flames entry could not be removed right now. Try again later.";
			}
			notice("Reset done", note);
		},
	);
}
