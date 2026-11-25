import {ensureStart, renderWS, saveProg} from "./blocks.ts";
import {$, $as, closest, el, later} from "./dom.ts";
import {drawEditor, markDraftBeaten, openEditor} from "./editor.ts";
import {endlessFail, endlessWin, startEndless} from "./endless.ts";
import {openGallery} from "./gallery.ts";
import {updateBestLine} from "./home.ts";
import {showHowTo} from "./howto.ts";
import {renderKnights} from "./knights.ts";
import {openMap, playCampaign} from "./map.ts";
import {closeModal, mBtn, modal} from "./modal.ts";
import {resetCampaign, resetEndless} from "./reset.ts";
import {showHint, startRun, stopRun} from "./run.ts";
import {loop, show} from "./screens.ts";
import {audio} from "./sound.ts";
import {hooks, play, screen} from "./state.ts";
import {prefs, store} from "./store.ts";

// Wires the screens together and their buttons up. src/main.ts starts each part on its own.

export function initHooks(): void
{
	hooks.openMap = openMap;
	hooks.openGallery = openGallery;
	hooks.openEditor = openEditor;
	hooks.playCampaign = playCampaign;
	hooks.endlessWin = endlessWin;
	hooks.endlessFail = endlessFail;
	hooks.testBeaten = markDraftBeaten;
	hooks.drawEditor = drawEditor;
}

export function initHome(): void
{
	$("#btn-campaign").addEventListener("click", (): void =>
	{
		audio();
		openMap();
	});
	$("#btn-endless").addEventListener(
		"click",
		later(async (): Promise<void> =>
		{
			audio();
			await startEndless();
		}),
	);
	$("#btn-editor").addEventListener("click", (): void =>
	{
		audio();
		openEditor();
	});
	$("#btn-gallery").addEventListener(
		"click",
		later(async (): Promise<void> =>
		{
			audio();
			await openGallery();
		}),
	);
	$("#btn-howto").addEventListener("click", showHowTo);
	$("#map-back").addEventListener("click", (): void =>
	{
		updateBestLine();
		show("home");
	});
	$("#btn-reset-campaign").addEventListener("click", resetCampaign);
	$("#btn-reset-endless").addEventListener("click", resetEndless);
	$("#gal-back").addEventListener("click", (): void =>
	{
		show("home");
	});
	const mb = $("#btn-mute");
	const setM = (): void =>
	{
		mb.textContent = prefs.muted ? "Sound: off" : "Sound: on";
	};
	setM();
	mb.addEventListener("click", (): void =>
	{
		prefs.muted = !prefs.muted;
		store.set("dc_muted", prefs.muted);
		setM();
	});
	const ni = $as("#nick", HTMLInputElement);
	ni.value = prefs.nick;
	ni.addEventListener("input", (): void =>
	{
		prefs.nick = ni.value.slice(0, 24);
		store.set("dc_nick", prefs.nick);
	});
	updateBestLine();
}

export function initPlay(): void
{
	$("#play-back").addEventListener(
		"click",
		later(async (): Promise<void> =>
		{
			stopRun(true);
			const mode = play.ctx!.mode;
			if (mode === "campaign") openMap();
			else if (mode === "gallery") await openGallery();
			else if (mode === "test") openEditor();
			else show("home");
		}),
	);
	$("#btn-run").addEventListener("click", startRun);
	$("#btn-stop").addEventListener("click", (): void =>
	{
		stopRun(false);
	});
	$("#btn-hint").addEventListener("click", later(showHint));
	$("#btn-clear").addEventListener("click", (): void =>
	{
		if (play.running) return;
		if (play.prog.length < 2) return;
		modal((c) =>
		{
			c.appendChild(el("h2", null, "Clear your spell?"));
			const r = el("div", "row");
			mBtn(r, "Clear", "fire", () =>
			{
				play.prog = [];
				ensureStart();
				saveProg();
				renderWS();
				closeModal();
			});
			mBtn(r, "Cancel", "", closeModal);
			c.appendChild(r);
		});
	});
	const speed = $("#speed");
	speed.addEventListener("click", (): void =>
	{
		prefs.speedIdx = (prefs.speedIdx + 1) % 3;
		store.set("dc_speed", prefs.speedIdx);
		speed.textContent = ["Speed 1x", "Speed 2x", "Speed 4x"][prefs.speedIdx]!;
	});
	$("#kv-blocks").addEventListener("click", (): void =>
	{
		prefs.knightView = "blocks";
		store.set("dc_kview", prefs.knightView);
		renderKnights();
	});
	$("#kv-code").addEventListener("click", (): void =>
	{
		prefs.knightView = "code";
		store.set("dc_kview", prefs.knightView);
		renderKnights();
	});
}

export function initKeys(): void
{
	$("#modal").addEventListener("keydown", (e) =>
	{
		if (e.key === "Escape")
		{
			const card = $("#modal-card");
			const b =
				card.querySelector<HTMLElement>("[data-esc]") ??
				card.querySelector<HTMLElement>(".row button:last-child");
			if (b) b.click();
		}
	});
	document.addEventListener("keydown", (e) =>
	{
		if (screen.current !== "play" || !$("#modal").classList.contains("hidden")) return;
		const typing = closest(e, "input,select,textarea");
		if ((e.code === "Space" || e.key === " ") && !typing && !e.repeat)
		{
			e.preventDefault();
			if (play.running) stopRun(false);
			else if (!play.runner) startRun();
			return;
		}
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
		{
			if (play.running) stopRun(false);
			else startRun();
		}
	});
}

// Shows the home screen and starts drawing.
export function start(): void
{
	show("home");
	requestAnimationFrame(loop);
}
