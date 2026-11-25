import {$, $as, context2d, el} from "./dom.ts";
import {boardCell, drawKnight} from "./draw.ts";
import {knightCodeText, type KnightType} from "./engine.ts";
import {updateAmmo} from "./hud.ts";
import {play} from "./state.ts";
import {prefs} from "./store.ts";

// The knights' cards beside the board: who each knight is and its code, as blocks or as text, with the line it runs
// next lit up during a run.

export const KINFO: Record<
	KnightType,
	{
		name: string;
		ability: string;
	}
> =
{
	soldier:
	{
		name: "Soldier",
		ability: "Attacks the square in front of it.",
	},
	shield:
	{
		name: "Shield Knight",
		ability: "Its shield blocks one hit from the front, then breaks. Hits from the side or behind work right away.",
	},
	archer:
	{
		name: "Archer",
		ability: "Shoots flying dragons up to 5 squares ahead. Harmless if you stay on the ground.",
	},
	rider:
	{
		name: "Mounted Knight",
		ability: "Charges 2 squares per step and tramples a dragon in its path.",
	},
	spearman:
	{
		name: "Spearman",
		ability: "Throws his spear up to 2 squares ahead.",
	},
	paladin:
	{
		name: "Paladin",
		ability: "Heavy armor: takes 2 hits to burn. A taco blast melts it in one.",
	},
};
export function opLabel(op: string, type: KnightType): string
{
	const labels: Record<string, string> =
	{
		F: type === "rider" ? "Charge 2" : "Step forward",
		L: "Turn left",
		R: "Turn right",
		U: "Turn around",
		A: type === "archer" ? "Shoot arrow" : type === "spearman" ? "Throw spear (2 squares)" : "Attack",
		W: "Wait",
		G:
			type === "archer"
				? "If dragon flying in range: shoot"
				: type === "spearman"
					? "If dragon within 2: throw spear"
					: "If dragon ahead: attack",
		T: "Turn to face dragon",
		C: "Chase: face dragon + step",
	};
	return labels[op]!;
}
export const OPS = ["F", "L", "R", "U", "A", "W", "G", "T", "C"];

export function renderKnights(): void
{
	const level = play.level!;
	const kl = $("#klist");
	kl.innerHTML = "";
	$("#kv-blocks").classList.toggle("on", prefs.knightView === "blocks");
	$("#kv-code").classList.toggle("on", prefs.knightView === "code");
	const s = play.currS;
	level.knights.forEach((k, i) =>
	{
		const st = s ? s.knights[i] : undefined;
		const dead = !!st && !st.alive;
		const c = el("div", `kcard${dead ? " dead" : ""}${play.hoverKnight === i ? " hover" : ""}`);
		c.dataset["k"] = String(i);
		const broken = !!st && k.type === "shield" && st.alive && !st.shield;
		const h = el("div", "khead");
		const cv = el("canvas");
		cv.width = 80;
		cv.height = 80;
		h.appendChild(cv);
		const tx = el("div");
		tx.appendChild(
			el("div", "kt", `${i + 1}. ${KINFO[k.type].name}${dead ? " (burnt)" : broken ? " (shield broken)" : ""}`),
		);
		tx.appendChild(el("div", "ka", KINFO[k.type].ability));
		h.appendChild(tx);
		c.appendChild(h);
		const pc = play.running && st?.alive ? st.pc : -1;
		if (prefs.knightView === "blocks")
		{
			const code = el("div", "kcode");
			code.appendChild(el("span", "kloop", "Loop forever:"));
			k.prog.split("").forEach((op, j) =>
			{
				code.appendChild(el("span", `kchip ${op}${j === pc ? " now" : ""}`, opLabel(op, k.type)));
			});
			c.appendChild(code);
		}
		else
		{
			const pre = el("pre", "ktext");
			const lines = knightCodeText(k);
			const kw = el("span", "kw", "while");
			pre.appendChild(kw);
			pre.appendChild(document.createTextNode(" (true) {\n"));
			lines.forEach((ln, j) =>
			{
				const sp = el("span", j === pc ? "now" : null, `  ${ln}`);
				pre.appendChild(sp);
				pre.appendChild(document.createTextNode("\n"));
			});
			pre.appendChild(document.createTextNode("}"));
			c.appendChild(pre);
		}
		c.addEventListener("mouseenter", (): void =>
		{
			play.hoverKnight = i;
			c.classList.add("hover");
		});
		c.addEventListener("mouseleave", (): void =>
		{
			play.hoverKnight = -1;
			c.classList.remove("hover");
		});
		kl.appendChild(c);
		const g = context2d(cv);
		g.fillStyle = "#b9cf8a";
		g.fillRect(0, 0, 80, 80);
		drawKnight(g, 40, 40, 72, k.type, ((st ? st.d : k.d) * Math.PI) / 2, 1, !!st && !st.shield);
	});
	updateAmmo();
}

// Lights up the knight cards for the knight under the pointer on the board.
export function initBoardHover(): void
{
	const bc = $as("#board", HTMLCanvasElement);
	bc.addEventListener("pointermove", (e) =>
	{
		const currS = play.currS;
		if (!currS) return;
		const c = boardCell(bc, e, currS);
		let k = -1;
		if (c) k = currS.knights.findIndex((n) => n.alive && n.x === c.x && n.y === c.y);
		if (k !== play.hoverKnight)
		{
			play.hoverKnight = k;
			document
				.querySelectorAll<HTMLElement>(".kcard")
				.forEach((n) => n.classList.toggle("hover", Number(n.dataset["k"]) === k));
			const card = document.querySelector(`.kcard[data-k="${k}"]`);
			if (card)
				card.scrollIntoView(
					{
						block: "nearest",
					},
				);
		}
	});
	bc.addEventListener("pointerleave", () =>
	{
		play.hoverKnight = -1;
		document.querySelectorAll(".kcard").forEach((n) =>
		{
			n.classList.remove("hover");
		});
	});
}
