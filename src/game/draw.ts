import {context2d} from "./dom.ts";
import {type BoardState, DX, DY, type KnightType} from "./engine.ts";
import {fx, REDUCED} from "./state.ts";

// Drawing the battlefield on a canvas: tiles, the dragon, the knights, fireballs, effects, particles and floating words.

const INK = "#3b2716";
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void
{
	g.beginPath();
	g.moveTo(x + r, y);
	g.arcTo(x + w, y, x + w, y + h, r);
	g.arcTo(x + w, y + h, x, y + h, r);
	g.arcTo(x, y + h, x, y, r);
	g.arcTo(x, y, x + w, y, r);
	g.closePath();
}
function hash(x: number, y: number, s: number): number
{
	let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
	h = ((h ^ (h >>> 13)) * 1274126177) | 0;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const dirAng = (d: number): number => [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d]!;

export function drawTile(
	g: CanvasRenderingContext2D,
	c: string,
	px: number,
	py: number,
	T: number,
	x: number,
	y: number,
	now: number,
): void
{
	// grass base for most
	const gr = hash(x, y, 1) < 0.5 ? "#b4cc85" : "#aac47b";
	if (c === "#")
	{
		g.fillStyle = "#a69a88";
		g.fillRect(px, py, T, T);
		g.fillStyle = "#bdb2a0";
		g.fillRect(px, py, T, T * 0.12);
		g.fillStyle = "#8a7e6c";
		g.fillRect(px, py + T * 0.88, T, T * 0.12);
		g.strokeStyle = "#6f6556";
		g.lineWidth = Math.max(1, T * 0.03);
		g.beginPath();
		for (let r = 1; r < 3; r++)
		{
			g.moveTo(px, py + (r * T) / 3);
			g.lineTo(px + T, py + (r * T) / 3);
		}
		for (let r = 0; r < 3; r++)
		{
			const off = ((r % 2) * T) / 4;
			for (let k = 0; k < 3; k++)
			{
				const xx = px + off + (k * T) / 2;
				if (xx > px && xx < px + T)
				{
					g.moveTo(xx, py + (r * T) / 3);
					g.lineTo(xx, py + ((r + 1) * T) / 3);
				}
			}
		}
		g.stroke();
		return;
	}
	if (c === "~")
	{
		g.fillStyle = "#78acd0";
		g.fillRect(px, py, T, T);
		g.strokeStyle = "rgba(255,255,255,.55)";
		g.lineWidth = Math.max(1, T * 0.035);
		for (let k = 0; k < 3; k++)
		{
			const wy = py + T * (0.25 + k * 0.27);
			const ph = now / 600 + x + k * 1.7;
			g.beginPath();
			for (let i = 0; i <= 8; i++)
			{
				const xx = px + T * (0.1 + i * 0.1);
				const yy = wy + Math.sin(ph + i * 0.9) * T * 0.03;
				if (i) g.lineTo(xx, yy);
				else g.moveTo(xx, yy);
			}
			g.stroke();
		}
		return;
	}
	g.fillStyle = c === "," ? "#a59b7f" : gr;
	g.fillRect(px, py, T, T);
	if (c === ",")
	{
		g.fillStyle = "rgba(60,45,30,.35)";
		for (let i = 0; i < 5; i++)
		{
			g.beginPath();
			g.arc(px + T * hash(x, y, i + 10), py + T * hash(x, y, i + 20), T * 0.04, 0, 7);
			g.fill();
		}
		g.fillStyle = "#5a4532";
		g.beginPath();
		g.arc(px + T / 2, py + T / 2, T * 0.1, 0, 7);
		g.fill();
		return;
	}
	// tufts
	g.strokeStyle = "rgba(60,95,40,.45)";
	g.lineWidth = Math.max(1, T * 0.025);
	for (let i = 0; i < 3; i++)
	{
		const tx = px + T * (0.15 + 0.7 * hash(x, y, i + 3)),
			ty = py + T * (0.2 + 0.65 * hash(x, y, i + 6));
		g.beginPath();
		g.moveTo(tx - T * 0.04, ty);
		g.lineTo(tx - T * 0.06, ty - T * 0.07);
		g.moveTo(tx, ty);
		g.lineTo(tx, ty - T * 0.09);
		g.moveTo(tx + T * 0.04, ty);
		g.lineTo(tx + T * 0.06, ty - T * 0.07);
		g.stroke();
	}
	if (c === "T")
	{
		g.fillStyle = "rgba(30,40,20,.25)";
		g.beginPath();
		g.ellipse(px + T * 0.55, py + T * 0.6, T * 0.36, T * 0.3, 0, 0, 7);
		g.fill();
		const blobs: [number, number, number, string][] = [
			[0.5, 0.45, 0.3, "#4c7c3a"],
			[0.35, 0.4, 0.18, "#5a8c45"],
			[0.62, 0.35, 0.17, "#5a8c45"],
			[0.45, 0.32, 0.12, "#78a85a"],
		];
		blobs.forEach((b) =>
		{
			g.fillStyle = b[3];
			g.beginPath();
			g.arc(px + T * b[0], py + T * b[1], T * b[2], 0, 7);
			g.fill();
		});
		g.strokeStyle = INK;
		g.lineWidth = Math.max(1, T * 0.025);
		g.beginPath();
		g.arc(px + T * 0.5, py + T * 0.45, T * 0.3, 0, 7);
		g.stroke();
	}
	if (c === "t") drawTaco(g, px + T / 2, py + T / 2 + Math.sin(now / 300 + x) * T * 0.03, T * 0.8);
}
function drawTaco(g: CanvasRenderingContext2D, cx: number, cy: number, S: number): void
{
	g.save();
	g.translate(cx, cy);
	g.fillStyle = "rgba(0,0,0,.18)";
	g.beginPath();
	g.ellipse(0, S * 0.22, S * 0.36, S * 0.08, 0, 0, 7);
	g.fill();
	// lettuce
	g.fillStyle = "#6fb04a";
	g.beginPath();
	for (let i = 0; i <= 8; i++)
	{
		const a = Math.PI + (i * Math.PI) / 8;
		const r = S * 0.4 + (i % 2) * S * 0.05;
		g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.95 + S * 0.12);
	}
	g.closePath();
	g.fill();
	// tomato
	g.fillStyle = "#d8432f";
	[
		[-0.2, -0.12],
		[0, -0.2],
		[0.2, -0.12],
	].forEach(([px, py]) =>
	{
		g.beginPath();
		g.arc(px! * S, py! * S + S * 0.08, S * 0.06, 0, 7);
		g.fill();
	});
	// shell
	g.fillStyle = "#ecba4c";
	g.strokeStyle = INK;
	g.lineWidth = Math.max(1, S * 0.035);
	g.beginPath();
	g.moveTo(-S * 0.4, S * 0.12);
	g.quadraticCurveTo(-S * 0.38, -S * 0.18, 0, -S * 0.08);
	g.quadraticCurveTo(S * 0.38, -S * 0.18, S * 0.4, S * 0.12);
	g.quadraticCurveTo(0, S * 0.32, -S * 0.4, S * 0.12);
	g.closePath();
	g.fill();
	g.stroke();
	g.fillStyle = "#c98d2e";
	[
		[-0.2, 0.1],
		[0.05, 0.16],
		[0.22, 0.06],
		[-0.05, 0.02],
	].forEach(([px, py]) =>
	{
		g.beginPath();
		g.arc(px! * S, py! * S, S * 0.025, 0, 7);
		g.fill();
	});
	g.restore();
}
export function drawDragon(
	g: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	T: number,
	ang: number,
	alt: number,
	now: number,
	flash = false,
	whip = 0,
): void
{
	g.save();
	// shadow
	g.fillStyle = `rgba(30,20,10,${0.28 - alt * 0.12})`;
	g.beginPath();
	g.ellipse(
		cx + alt * T * 0.08,
		cy + alt * T * 0.14 + T * 0.04,
		T * (0.32 + alt * 0.04),
		T * (0.24 + alt * 0.03),
		0,
		0,
		7,
	);
	g.fill();
	const wq = whip > 0 ? Math.sin(whip * Math.PI) : 0,
		swing = whip > 0 ? Math.sin(whip * Math.PI * 2) : 0;
	g.translate(cx, cy - alt * T * 0.16);
	g.rotate(ang + Math.PI / 2 + swing * 0.1);
	const s = 1 + alt * 0.12;
	g.scale(s, s);
	const u = T,
		lw = Math.max(1, u * 0.028);
	const body = flash ? "#e05a45" : "#3f8f5a",
		dark = flash ? "#a8352a" : "#2c6b42",
		belly = "#e6d49a";
	g.lineJoin = "round";
	g.lineCap = "round";
	// tail: gentle wag, or a big stretch-and-sweep during a tail whip
	const wag = Math.sin(now / 260) * 0.06 * (1 - wq) - swing * 0.13,
		L = 1 + wq * 0.8; // tip stays inside the square behind
	g.strokeStyle = INK;
	g.lineWidth = u * 0.13;
	g.beginPath();
	g.moveTo(0, u * 0.12);
	g.bezierCurveTo(u * (0.02 + wag * 0.4), u * 0.35 * L, u * (0.2 + wag), u * 0.38 * L, u * (0.12 + wag), u * 0.5 * L);
	g.stroke();
	g.strokeStyle = body;
	g.lineWidth = u * 0.09;
	g.stroke();
	g.fillStyle = dark;
	g.strokeStyle = INK;
	g.lineWidth = lw;
	g.beginPath();
	const tx = u * (0.12 + wag),
		ty = u * 0.5 * L;
	const ts = 1 + wq * 0.4;
	g.moveTo(tx, ty + u * 0.02);
	g.lineTo(tx - u * 0.07 * ts, ty + u * 0.09 * ts);
	g.lineTo(tx + u * 0.09 * ts, ty + u * 0.1 * ts);
	g.closePath();
	g.fill();
	g.stroke();
	// wings
	const flap = alt > 0.5 ? 1 + Math.sin(now / 90) * 0.18 : 0.62 + alt * 0.3;
	for (const sd of [-1, 1])
	{
		g.save();
		g.scale(sd * flap, 1);
		g.fillStyle = dark;
		g.strokeStyle = INK;
		g.lineWidth = lw;
		g.beginPath();
		g.moveTo(u * 0.1, -u * 0.1);
		g.lineTo(u * 0.48, -u * 0.24);
		g.quadraticCurveTo(u * 0.44, -u * 0.08, u * 0.47, u * 0.06);
		g.quadraticCurveTo(u * 0.36, 0, u * 0.34, u * 0.12);
		g.quadraticCurveTo(u * 0.24, u * 0.04, u * 0.2, u * 0.14);
		g.quadraticCurveTo(u * 0.15, u * 0.05, u * 0.1, u * 0.08);
		g.closePath();
		g.fill();
		g.stroke();
		g.strokeStyle = "rgba(255,240,200,.35)";
		g.beginPath();
		g.moveTo(u * 0.12, -u * 0.08);
		g.lineTo(u * 0.47, u * 0.05);
		g.moveTo(u * 0.12, -u * 0.08);
		g.lineTo(u * 0.34, u * 0.11);
		g.stroke();
		g.restore();
	}
	// body
	g.fillStyle = body;
	g.strokeStyle = INK;
	g.lineWidth = lw;
	g.beginPath();
	g.ellipse(0, 0, u * 0.16, u * 0.25, 0, 0, 7);
	g.fill();
	g.stroke();
	// spine
	g.fillStyle = "#e2b84a";
	for (let i = 0; i < 4; i++)
	{
		const y = -u * 0.14 + i * u * 0.09;
		g.beginPath();
		g.moveTo(-u * 0.03, y + u * 0.03);
		g.lineTo(0, y - u * 0.03);
		g.lineTo(u * 0.03, y + u * 0.03);
		g.closePath();
		g.fill();
	}
	// neck + head
	g.fillStyle = body;
	g.beginPath();
	g.ellipse(0, -u * 0.27, u * 0.1, u * 0.08, 0, 0, 7);
	g.fill();
	g.beginPath();
	g.ellipse(0, -u * 0.34, u * 0.11, u * 0.12, 0, 0, 7);
	g.fill();
	g.stroke();
	g.beginPath();
	g.ellipse(0, -u * 0.44, u * 0.075, u * 0.07, 0, 0, 7);
	g.fill();
	g.stroke();
	// horns
	g.fillStyle = belly;
	g.strokeStyle = INK;
	for (const sd of [-1, 1])
	{
		g.beginPath();
		g.moveTo(sd * u * 0.06, -u * 0.32);
		g.lineTo(sd * u * 0.14, -u * 0.22);
		g.lineTo(sd * u * 0.09, -u * 0.36);
		g.closePath();
		g.fill();
		g.stroke();
	}
	// eyes
	for (const sd of [-1, 1])
	{
		g.fillStyle = "#ffe066";
		g.beginPath();
		g.arc(sd * u * 0.055, -u * 0.37, u * 0.025, 0, 7);
		g.fill();
		g.fillStyle = INK;
		g.beginPath();
		g.arc(sd * u * 0.055, -u * 0.375, u * 0.011, 0, 7);
		g.fill();
	}
	// nostrils
	g.fillStyle = INK;
	for (const sd of [-1, 1])
	{
		g.beginPath();
		g.arc(sd * u * 0.025, -u * 0.49, u * 0.01, 0, 7);
		g.fill();
	}
	g.restore();
}
const KCOL: Record<KnightType, string> =
{
	soldier: "#3d5fa8",
	shield: "#8a2f3a",
	archer: "#4b7a3a",
	rider: "#6b3f8f",
	spearman: "#2f7f86",
	paladin: "#f2ead2",
};
export function drawKnight(
	g: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	T: number,
	type: KnightType,
	ang: number,
	alpha: number,
	noShield = false,
): void
{
	g.save();
	g.globalAlpha = alpha;
	g.fillStyle = "rgba(30,20,10,.22)";
	g.beginPath();
	g.ellipse(
		cx + T * 0.03,
		cy + T * 0.05,
		T * (type === "rider" ? 0.24 : 0.25),
		T * (type === "rider" ? 0.36 : 0.22),
		ang + Math.PI / 2,
		0,
		7,
	);
	g.fill();
	g.translate(cx, cy);
	g.rotate(ang + Math.PI / 2);
	const u = T,
		lw = Math.max(1, u * 0.028);
	g.lineWidth = lw;
	g.strokeStyle = INK;
	g.lineJoin = "round";
	g.lineCap = "round";
	if (type === "rider")
	{
		// horse
		g.fillStyle = "#8a5a33";
		g.beginPath();
		g.ellipse(0, u * 0.06, u * 0.15, u * 0.32, 0, 0, 7);
		g.fill();
		g.stroke();
		g.beginPath();
		g.ellipse(0, -u * 0.3, u * 0.07, u * 0.13, 0, 0, 7);
		g.fill();
		g.stroke();
		g.strokeStyle = "#3a2414";
		g.lineWidth = u * 0.04;
		g.beginPath();
		g.moveTo(0, -u * 0.22);
		g.lineTo(0, -u * 0.06);
		g.stroke();
		g.beginPath();
		g.moveTo(0, u * 0.36);
		g.lineTo(u * 0.03, u * 0.46);
		g.stroke();
		g.lineWidth = lw;
		g.strokeStyle = INK;
		g.fillStyle = "#8a5a33";
		for (const sd of [-1, 1])
		{
			g.beginPath();
			g.moveTo(sd * u * 0.03, -u * 0.38);
			g.lineTo(sd * u * 0.06, -u * 0.46);
			g.lineTo(sd * u * 0.07, -u * 0.37);
			g.fill();
		}
		// lance
		g.strokeStyle = "#7a5a32";
		g.lineWidth = u * 0.035;
		g.beginPath();
		g.moveTo(u * 0.14, u * 0.1);
		g.lineTo(u * 0.14, -u * 0.6);
		g.stroke();
		g.fillStyle = "#d9dde2";
		g.strokeStyle = INK;
		g.lineWidth = lw;
		g.beginPath();
		g.moveTo(u * 0.1, -u * 0.55);
		g.lineTo(u * 0.14, -u * 0.68);
		g.lineTo(u * 0.18, -u * 0.55);
		g.closePath();
		g.fill();
		g.stroke();
		// rider
		g.fillStyle = KCOL.rider;
		g.beginPath();
		g.arc(0, u * 0.06, u * 0.14, 0, 7);
		g.fill();
		g.stroke();
		g.fillStyle = "#b8bcc2";
		g.beginPath();
		g.arc(0, u * 0.04, u * 0.085, 0, 7);
		g.fill();
		g.stroke();
		g.fillStyle = "#e2b84a";
		g.beginPath();
		g.moveTo(-u * 0.02, u * 0.1);
		g.lineTo(0, u * 0.18);
		g.lineTo(u * 0.02, u * 0.1);
		g.fill();
		g.restore();
		return;
	}
	const big = type === "paladin" ? 1.15 : 1;
	if (big !== 1) g.scale(big, big);
	// body/tabard
	g.fillStyle = KCOL[type];
	g.beginPath();
	g.ellipse(0, u * 0.02, u * 0.22, u * 0.16, 0, 0, 7);
	g.fill();
	g.stroke();
	if (type === "paladin")
	{
		g.fillStyle = "#d4a937";
		g.fillRect(-u * 0.025, -u * 0.1, u * 0.05, u * 0.24);
		g.fillRect(-u * 0.12, u * 0.06, u * 0.24, u * 0.045);
	}
	// pauldrons
	g.fillStyle = type === "archer" ? "#7a5a32" : type === "paladin" ? "#d4a937" : "#b8bcc2";
	for (const sd of [-1, 1])
	{
		g.beginPath();
		g.arc(sd * u * 0.19, 0, u * 0.07, 0, 7);
		g.fill();
		g.stroke();
	}
	if (type === "spearman")
	{
		g.strokeStyle = "#6b4a2a";
		g.lineWidth = u * 0.04;
		g.beginPath();
		g.moveTo(u * 0.2, u * 0.2);
		g.lineTo(u * 0.2, -u * 0.92);
		g.stroke();
		g.fillStyle = "#d9dde2";
		g.strokeStyle = INK;
		g.lineWidth = lw;
		g.beginPath();
		g.moveTo(u * 0.15, -u * 0.84);
		g.lineTo(u * 0.2, -u * 1.02);
		g.lineTo(u * 0.25, -u * 0.84);
		g.closePath();
		g.fill();
		g.stroke();
	}
	if (type === "paladin")
	{
		// big sword
		g.strokeStyle = INK;
		g.lineWidth = lw;
		g.fillStyle = "#e3e6ea";
		g.beginPath();
		g.moveTo(u * 0.17, -u * 0.08);
		g.lineTo(u * 0.17, -u * 0.48);
		g.lineTo(u * 0.2, -u * 0.54);
		g.lineTo(u * 0.23, -u * 0.48);
		g.lineTo(u * 0.23, -u * 0.08);
		g.closePath();
		g.fill();
		g.stroke();
		g.fillStyle = "#d4a937";
		g.fillRect(u * 0.11, -u * 0.1, u * 0.18, u * 0.04);
	}
	if (type === "soldier")
	{
		g.strokeStyle = "#7a5a32";
		g.lineWidth = u * 0.035;
		g.beginPath();
		g.moveTo(u * 0.2, u * 0.15);
		g.lineTo(u * 0.2, -u * 0.5);
		g.stroke();
		g.fillStyle = "#d9dde2";
		g.strokeStyle = INK;
		g.lineWidth = lw;
		g.beginPath();
		g.moveTo(u * 0.16, -u * 0.44);
		g.lineTo(u * 0.2, -u * 0.58);
		g.lineTo(u * 0.24, -u * 0.44);
		g.closePath();
		g.fill();
		g.stroke();
	}
	if (type === "archer")
	{
		g.strokeStyle = "#6b4423";
		g.lineWidth = u * 0.04;
		g.beginPath();
		g.arc(0, -u * 0.06, u * 0.3, -Math.PI * 0.82, -Math.PI * 0.18);
		g.stroke();
		g.strokeStyle = "#f3e6c4";
		g.lineWidth = Math.max(1, u * 0.012);
		g.beginPath();
		const a1 = -Math.PI * 0.82,
			a2 = -Math.PI * 0.18;
		g.moveTo(Math.cos(a1) * u * 0.3, -u * 0.06 + Math.sin(a1) * u * 0.3);
		g.lineTo(Math.cos(a2) * u * 0.3, -u * 0.06 + Math.sin(a2) * u * 0.3);
		g.stroke();
		// quiver
		g.fillStyle = "#7a5a32";
		g.strokeStyle = INK;
		g.lineWidth = lw;
		rr(g, -u * 0.04, u * 0.1, u * 0.08, u * 0.16, u * 0.02);
		g.fill();
		g.stroke();
	}
	// helmet / hood
	g.fillStyle = type === "archer" ? "#5c8f47" : type === "paladin" ? "#d4a937" : "#b8bcc2";
	g.strokeStyle = INK;
	g.lineWidth = lw;
	g.beginPath();
	g.arc(0, -u * 0.02, u * 0.11, 0, 7);
	g.fill();
	g.stroke();
	if (type === "paladin")
	{
		g.fillStyle = "#c4432a";
		g.beginPath();
		g.ellipse(0, u * 0.06, u * 0.035, u * 0.09, 0, 0, 7);
		g.fill();
	}
	if (type !== "archer")
	{
		g.fillStyle = INK;
		g.fillRect(-u * 0.06, -u * 0.11, u * 0.12, u * 0.025);
		g.fillStyle = "#e2b84a";
		g.beginPath();
		g.moveTo(-u * 0.02, u * 0.06);
		g.lineTo(0, u * 0.16);
		g.lineTo(u * 0.02, u * 0.06);
		g.fill();
	}
	if (type === "shield" && !noShield)
	{
		g.strokeStyle = INK;
		g.lineWidth = u * 0.11;
		g.beginPath();
		g.arc(0, u * 0.02, u * 0.29, -Math.PI * 0.85, -Math.PI * 0.15);
		g.stroke();
		g.strokeStyle = "#d0d4da";
		g.lineWidth = u * 0.08;
		g.stroke();
		g.strokeStyle = "#b8323c";
		g.lineWidth = u * 0.025;
		g.stroke();
	}
	g.restore();
}
function lerp(a: number, b: number, t: number): number
{
	return a + (b - a) * t;
}
function drawBall(g: CanvasRenderingContext2D, x: number, y: number, T: number): void
{
	const gr = g.createRadialGradient(x, y, 0, x, y, T * 0.32);
	gr.addColorStop(0, "rgba(255,250,200,1)");
	gr.addColorStop(0.45, "rgba(255,160,40,.95)");
	gr.addColorStop(1, "rgba(220,60,20,0)");
	g.fillStyle = gr;
	g.beginPath();
	g.arc(x, y, T * 0.32, 0, 7);
	g.fill();
}
function angLerp(a: number, b: number, t: number): number
{
	let d = b - a;
	while (d > Math.PI) d -= Math.PI * 2;
	while (d < -Math.PI) d += Math.PI * 2;
	return a + d * t;
}
const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export interface DrawOptions
{
	hover?: number;
	selected?: number;
	scorches?:
	{
		x: number;
		y: number;
	}[];
	name?: string;
	noShake?: boolean;
}
// Draws the board between two states, p of the way from S0 to S1, at time now.
export function drawBoard(
	cv: HTMLCanvasElement,
	S0: BoardState,
	S1: BoardState,
	p: number,
	now: number,
	opts: DrawOptions = {},
): void
{
	const g = context2d(cv);
	const dpr = window.devicePixelRatio || 1;
	const W = cv.width / dpr,
		H = cv.height / dpr;
	g.setTransform(dpr, 0, 0, dpr, 0, 0);
	g.clearRect(0, 0, W, H);
	const w = S1.w,
		h = S1.h;
	const pad = 10;
	const T = Math.floor(Math.min((W - pad * 2) / w, (H - pad * 2) / h));
	const ox = Math.floor((W - T * w) / 2),
		oy = Math.floor((H - T * h) / 2);
	g.save();
	if (now < fx.shakeUntil && !REDUCED && !opts.noShake)
		g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
	// frame
	g.fillStyle = "#7a5530";
	rr(g, ox - 8, oy - 8, T * w + 16, T * h + 16, 10);
	g.fill();
	g.strokeStyle = "#e6d3a6";
	g.lineWidth = 2;
	rr(g, ox - 5, oy - 5, T * w + 10, T * h + 10, 8);
	g.stroke();
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) drawTile(g, S1.tiles[y * w + x]!, ox + x * T, oy + y * T, T, x, y, now);
	// scorch
	for (const s of opts.scorches ?? [])
	{
		g.fillStyle = "rgba(40,25,15,.35)";
		g.beginPath();
		g.ellipse(ox + (s.x + 0.5) * T, oy + (s.y + 0.55) * T, T * 0.3, T * 0.22, 0, 0, 7);
		g.fill();
	}
	// grid
	g.strokeStyle = "rgba(59,39,22,.16)";
	g.lineWidth = 1;
	g.beginPath();
	for (let x = 1; x < w; x++)
	{
		g.moveTo(ox + x * T + 0.5, oy);
		g.lineTo(ox + x * T + 0.5, oy + h * T);
	}
	for (let y = 1; y < h; y++)
	{
		g.moveTo(ox, oy + y * T + 0.5);
		g.lineTo(ox + w * T, oy + y * T + 0.5);
	}
	g.stroke();
	const cxy = (x: number, y: number): [number, number] => [ox + (x + 0.5) * T, oy + (y + 0.5) * T];
	// glow effects under
	for (const e of fx.effects)
	{
		const q = (now - e.t0) / e.dur;
		if (q < 0 || q > 1) continue;
		if (e.t === "whip")
		{
			const a = dirAng(e.d);
			const tx = e.x + Math.round(Math.cos(a)),
				ty = e.y + Math.round(Math.sin(a));
			if (tx >= 0 && ty >= 0 && tx < w && ty < h)
			{
				const px = ox + tx * T,
					py = oy + ty * T;
				g.fillStyle = `rgba(163,69,107,${0.32 * (1 - q)})`;
				g.fillRect(px, py, T, T);
				g.strokeStyle = `rgba(163,69,107,${1 - q * 0.6})`;
				g.lineWidth = 3;
				g.strokeRect(px + 2, py + 2, T - 4, T - 4);
			}
		}
		if (e.t === "roar")
		{
			const [cx, cy] = cxy(e.x, e.y);
			g.save();
			g.strokeStyle = `rgba(138,58,18,${0.7 * (1 - q)})`;
			g.lineWidth = T * 0.08;
			g.beginPath();
			g.arc(cx, cy, T * (0.4 + q * 3), 0, 7);
			g.stroke();
			g.lineWidth = T * 0.04;
			g.beginPath();
			g.arc(cx, cy, T * (0.2 + q * 2.2), 0, 7);
			g.stroke();
			g.restore();
		}
		if (e.t === "gust")
		{
			const [cx, cy] = cxy(e.x, e.y);
			const a = dirAng(e.d);
			g.save();
			g.strokeStyle = `rgba(255,255,255,${0.85 * (1 - q)})`;
			g.lineCap = "round";
			g.lineWidth = T * 0.06;
			for (let j = -1; j <= 1; j++)
			{
				const off = j * T * 0.25,
					len = T * (0.6 + q * 1.8),
					st = T * (0.4 + q * 0.8);
				const px = -Math.sin(a) * off,
					py = Math.cos(a) * off;
				g.beginPath();
				g.moveTo(cx + px + Math.cos(a) * st, cy + py + Math.sin(a) * st);
				g.quadraticCurveTo(
					cx + px + Math.cos(a) * (st + len / 2) - Math.sin(a) * T * 0.12,
					cy + py + Math.sin(a) * (st + len / 2) + Math.cos(a) * T * 0.12,
					cx + px + Math.cos(a) * (st + len),
					cy + py + Math.sin(a) * (st + len),
				);
				g.stroke();
			}
			g.restore();
		}
		if (e.t === "spinup")
		{
			const [cx, cy] = cxy(e.x, e.y);
			g.save();
			g.strokeStyle = `rgba(255,150,40,${0.8 * (1 - q * 0.5)})`;
			g.lineWidth = T * 0.07;
			g.setLineDash([T * 0.15, T * 0.1]);
			g.lineDashOffset = -now / 30;
			g.beginPath();
			g.arc(cx, cy, T * 0.55, 0, 7);
			g.stroke();
			g.restore();
		}
		if (e.t === "glow")
		{
			const [cx, cy] = cxy(e.x, e.y);
			const gr = g.createRadialGradient(cx, cy, 0, cx, cy, T * 0.7);
			gr.addColorStop(0, `rgba(255,170,40,${0.6 * (1 - q)})`);
			gr.addColorStop(1, "rgba(255,120,20,0)");
			g.fillStyle = gr;
			g.fillRect(cx - T, cy - T, T * 2, T * 2);
		}
		if (e.t === "blast")
		{
			const [sx, sy] = cxy(e.x, e.y);
			g.save();
			g.globalAlpha = (1 - q) * 0.75;
			g.fillStyle = "#ff9a2a";
			const len = (e.n + 0.5) * T * Math.min(1, q * 3);
			const wdt = T * 0.8 * (1 - q * 0.5);
			if (DX[e.d]) g.fillRect(e.d === 1 ? sx : sx - len, sy - wdt / 2, len, wdt);
			else g.fillRect(sx - wdt / 2, e.d === 2 ? sy : sy - len, wdt, len);
			g.restore();
		}
	}
	// knights
	const pe = ease(Math.min(1, p));
	S1.knights.forEach((k1, i) =>
	{
		const k0 = S0.knights[i] ?? k1;
		if (!k0.alive && !k1.alive) return;
		let alpha = 1,
			x = lerp(k0.x, k1.x, pe),
			y = lerp(k0.y, k1.y, pe);
		const a = angLerp(dirAng(k0.d), dirAng(k1.d), pe);
		if (k0.alive && !k1.alive)
		{
			alpha = Math.max(0, 1 - p * 1.4);
			x = k0.x;
			y = k0.y;
		}
		const [cx, cy] = cxy(x, y);
		if (opts.hover === i || opts.selected === i)
		{
			g.strokeStyle = opts.selected === i ? "#c4432a" : "#e2b84a";
			g.lineWidth = 3;
			g.beginPath();
			g.arc(cx, cy, T * 0.46, 0, 7);
			g.stroke();
		}
		if (k0.alive && !k1.alive)
		{
			g.save();
			g.filter = "sepia(1) brightness(.5)";
			drawKnight(g, cx, cy, T, k1.type, a, alpha, !k1.shield);
			g.restore();
		}
		else drawKnight(g, cx, cy, T, k1.type, a, alpha, !k1.shield);
		// facing marker
		g.fillStyle = "rgba(59,39,22,.55)";
		const fa = dirAng(k1.d);
		const mx = cx + Math.cos(fa) * T * 0.44,
			my = cy + Math.sin(fa) * T * 0.44;
		g.beginPath();
		g.moveTo(mx + Math.cos(fa) * T * 0.05, my + Math.sin(fa) * T * 0.05);
		g.lineTo(mx + Math.cos(fa + 2.3) * T * 0.07, my + Math.sin(fa + 2.3) * T * 0.07);
		g.lineTo(mx + Math.cos(fa - 2.3) * T * 0.07, my + Math.sin(fa - 2.3) * T * 0.07);
		g.closePath();
		g.globalAlpha = alpha;
		g.fill();
		g.globalAlpha = 1;
		if (k1.alive && k1.stun > 0)
		{
			g.save();
			g.fillStyle = "#ffd54a";
			g.strokeStyle = INK;
			g.lineWidth = 1;
			g.font = `bold ${Math.max(10, Math.floor(T * 0.2))}px serif`;
			g.textAlign = "center";
			g.textBaseline = "middle";
			for (let j = 0; j < 3; j++)
			{
				const an = now / 300 + j * 2.09;
				const sx = cx + Math.cos(an) * T * 0.28,
					sy = cy - T * 0.38 + Math.sin(an) * T * 0.08;
				g.strokeText("★", sx, sy);
				g.fillText("★", sx, sy);
			}
			g.restore();
		}
		if (k1.type === "paladin" && k1.alive)
		{
			const hp = k1.hp || 2;
			for (let j = 0; j < 2; j++)
			{
				g.fillStyle = j < hp ? "#d4a937" : "rgba(59,39,22,.25)";
				g.strokeStyle = INK;
				g.lineWidth = 1;
				g.beginPath();
				g.arc(ox + x * T + T * 0.62 + j * T * 0.13, oy + y * T + T * 0.12, Math.max(3, T * 0.05), 0, 7);
				g.fill();
				g.stroke();
			}
		}
		// badge
		const bxx = ox + x * T + T * 0.14,
			byy = oy + y * T + T * 0.14;
		g.globalAlpha = alpha;
		g.fillStyle = "#f1e4c3";
		g.strokeStyle = INK;
		g.lineWidth = 1.5;
		g.beginPath();
		g.arc(bxx, byy, Math.max(7, T * 0.12), 0, 7);
		g.fill();
		g.stroke();
		g.fillStyle = INK;
		g.font = `bold ${Math.max(9, Math.floor(T * 0.15))}px Alegreya, Georgia, serif`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.fillText(String(i + 1), bxx, byy + 1);
		g.globalAlpha = 1;
	});
	// dragon
	const d1 = S1.dragon;
	if (d1)
	{
		const d0 = S0.dragon!;
		const x = lerp(d0.x, d1.x, pe),
			y = lerp(d0.y, d1.y, pe),
			a = angLerp(dirAng(d0.d), dirAng(d1.d), pe),
			alt = lerp(d0.fly ? 1 : 0, d1.fly ? 1 : 0, pe);
		const [cx, cy] = cxy(x, y);
		const we = fx.effects.find((e) => e.t === "whip" && now >= e.t0 && now - e.t0 < e.dur);
		const wq = we ? (now - we.t0) / we.dur : 0;
		drawDragon(g, cx, cy, T, a, alt, now, now < fx.hitFlashUntil && Math.floor(now / 80) % 2 === 0, wq);
		if (d1.curl && p > 0.1)
		{
			g.save();
			g.globalAlpha = Math.min(1, p * 2) * 0.85;
			g.strokeStyle = "#5d4ac9";
			g.lineWidth = T * 0.06;
			g.fillStyle = "rgba(93,74,201,.18)";
			g.beginPath();
			g.arc(cx, cy - alt * T * 0.16, T * 0.45, 0, 7);
			g.fill();
			g.stroke();
			g.restore();
		}
		if (opts.name)
		{
			const fs = Math.max(11, Math.floor(T * 0.2));
			g.font = `bold ${fs}px Alegreya, Georgia, serif`;
			g.textAlign = "center";
			g.textBaseline = "middle";
			const ty = cy - alt * T * 0.16 - T * 0.56;
			const tw = g.measureText(opts.name).width + 10;
			g.fillStyle = "rgba(241,228,195,.92)";
			rr(g, cx - tw / 2, ty - fs * 0.65, tw, fs * 1.3, fs * 0.5);
			g.fill();
			g.strokeStyle = INK;
			g.lineWidth = 1;
			g.stroke();
			g.fillStyle = "#2c6b42";
			g.fillText(opts.name, cx, ty + 1);
		}
	}
	// fireballs in flight (one square per step)
	for (const b1 of S1.balls)
	{
		const b0 = S0.balls.find((b) => b.id === b1.id);
		const sx = b0 ? b0.x : S0.dragon!.x,
			sy = b0 ? b0.y : S0.dragon!.y;
		const [cx, cy] = cxy(lerp(sx, b1.x, pe), lerp(sy, b1.y, pe));
		drawBall(g, cx, cy, T);
		if (Math.random() < 0.6)
			fx.particles.push(
				{
					x: (cx - ox) / T,
					y: (cy - oy) / T,
					vx: -DX[b1.d]! * 0.3,
					vy: -DY[b1.d]! * 0.3,
					life: 0,
					max: 0.35,
					kind: "fire",
					size: 0.12,
					delay: 0,
				},
			);
	}
	// chomp: taco in the dragon's jaws, shrinking bite by bite
	for (const e of fx.effects)
	{
		if (e.t !== "chomp") continue;
		const q = (now - e.t0) / e.dur;
		if (q < 0 || q > 1) continue;
		const [cx, cy] = cxy(e.x, e.y);
		const a = dirAng(e.d);
		const bites = Math.min(3, Math.floor(q * 4));
		const sc = 1 - bites * 0.28;
		const wob = Math.sin(now / 45) * 0.12;
		g.save();
		g.translate(cx + Math.cos(a) * T * 0.5, cy + Math.sin(a) * T * 0.5);
		g.rotate(a + Math.PI / 2 + wob);
		if (sc > 0.1) drawTaco(g, 0, 0, T * 0.62 * sc);
		g.restore();
	}
	// arrows / stabs
	for (const e of fx.effects)
	{
		const q = (now - e.t0) / e.dur;
		if (q < 0 || q > 1) continue;
		if (e.t === "arrow")
		{
			const [x0, y0] = cxy(e.x0, e.y0),
				[x1, y1] = cxy(e.x1, e.y1);
			const ax = lerp(x0, x1, q),
				ay = lerp(y0, y1, q);
			const an = Math.atan2(y1 - y0, x1 - x0);
			g.strokeStyle = INK;
			g.lineWidth = 2;
			g.beginPath();
			g.moveTo(ax - Math.cos(an) * T * 0.3, ay - Math.sin(an) * T * 0.3);
			g.lineTo(ax, ay);
			g.stroke();
			g.fillStyle = "#d9dde2";
			g.beginPath();
			g.moveTo(ax + Math.cos(an) * T * 0.08, ay + Math.sin(an) * T * 0.08);
			g.lineTo(ax + Math.cos(an + 2.5) * T * 0.06, ay + Math.sin(an + 2.5) * T * 0.06);
			g.lineTo(ax + Math.cos(an - 2.5) * T * 0.06, ay + Math.sin(an - 2.5) * T * 0.06);
			g.fill();
		}
		if (e.t === "whip" && q > 0.2 && q < 0.85)
		{
			const k = (q - 0.2) / 0.65;
			const [cx, cy] = cxy(e.x, e.y);
			const a = dirAng(e.d);
			const bx = cx + Math.cos(a) * T,
				by = cy + Math.sin(a) * T;
			g.save();
			g.lineCap = "round";
			g.strokeStyle = `rgba(255,250,235,${0.9 * (1 - k)})`;
			g.lineWidth = T * 0.12;
			g.beginPath();
			g.arc(bx, by, T * 0.28, a - Math.PI / 2 - 1.2 + k * 2.4, a - Math.PI / 2 - 0.2 + k * 2.4);
			g.stroke();
			g.strokeStyle = `rgba(163,69,107,${1 - k})`;
			g.lineWidth = T * 0.07;
			g.stroke();
			g.restore();
		}
		if (e.t === "charge")
		{
			const [cx, cy] = cxy(e.x, e.y);
			const a = dirAng(e.d);
			const mx = cx + Math.cos(a) * T * 0.42,
				my = cy + Math.sin(a) * T * 0.42;
			const r = T * (0.06 + 0.14 * Math.min(1, q * 1.3));
			const gr = g.createRadialGradient(mx, my, 0, mx, my, r * 2.2);
			gr.addColorStop(0, "rgba(255,240,160,.95)");
			gr.addColorStop(0.5, "rgba(255,150,40,.7)");
			gr.addColorStop(1, "rgba(255,90,20,0)");
			g.fillStyle = gr;
			g.beginPath();
			g.arc(mx, my, r * 2.2, 0, 7);
			g.fill();
		}
		if (e.t === "fbgone")
		{
			const [x0, y0] = cxy(e.x0, e.y0),
				[x1, y1] = cxy(e.x1, e.y1);
			drawBall(g, lerp(x0, x1, q), lerp(y0, y1, q), T);
		}
		if (e.t === "spear")
		{
			const [x0, y0] = cxy(e.x0, e.y0),
				[x1, y1] = cxy(e.x1, e.y1);
			const k = Math.min(1, q * 1.25);
			const sx = lerp(x0, x1, k),
				sy = lerp(y0, y1, k);
			const an = Math.atan2(y1 - y0, x1 - x0);
			g.save();
			g.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
			g.strokeStyle = "#6b4a2a";
			g.lineWidth = Math.max(2, T * 0.05);
			g.lineCap = "round";
			g.beginPath();
			g.moveTo(sx - Math.cos(an) * T * 0.55, sy - Math.sin(an) * T * 0.55);
			g.lineTo(sx, sy);
			g.stroke();
			g.fillStyle = "#d9dde2";
			g.strokeStyle = INK;
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(sx + Math.cos(an) * T * 0.14, sy + Math.sin(an) * T * 0.14);
			g.lineTo(sx + Math.cos(an + 2.4) * T * 0.07, sy + Math.sin(an + 2.4) * T * 0.07);
			g.lineTo(sx + Math.cos(an - 2.4) * T * 0.07, sy + Math.sin(an - 2.4) * T * 0.07);
			g.closePath();
			g.fill();
			g.stroke();
			g.restore();
		}
		if (e.t === "stab")
		{
			const [cx, cy] = cxy(e.x, e.y);
			g.strokeStyle = `rgba(255,255,255,${1 - q})`;
			g.lineWidth = 3;
			g.beginPath();
			g.moveTo(cx - T * 0.25, cy - T * 0.25 * (1 - q));
			g.lineTo(cx + T * 0.25, cy + T * 0.25 * (1 - q));
			g.stroke();
		}
	}
	// particles
	for (const pt of fx.particles)
	{
		if (pt.life < pt.delay) continue;
		const q = (pt.life - pt.delay) / pt.max;
		if (q > 1) continue;
		const [px, py] = cxy(pt.x - 0.5, pt.y - 0.5);
		if (pt.kind === "fire")
		{
			const col = q < 0.3 ? "255,240,150" : q < 0.6 ? "255,160,40" : "200,60,20";
			g.fillStyle = `rgba(${col},${1 - q})`;
			g.beginPath();
			g.arc(px, py, T * pt.size * (1 - q * 0.5), 0, 7);
			g.fill();
		}
		else if (pt.kind === "smoke")
		{
			g.fillStyle = `rgba(70,60,55,${0.5 * (1 - q)})`;
			g.beginPath();
			g.arc(px, py, T * pt.size * (0.6 + q), 0, 7);
			g.fill();
		}
		else if (pt.kind === "ember")
		{
			g.fillStyle = `rgba(255,180,60,${1 - q})`;
			g.beginPath();
			g.arc(px, py, T * pt.size, 0, 7);
			g.fill();
		}
		else if (pt.kind === "water")
		{
			g.fillStyle = `rgba(120,180,230,${1 - q})`;
			g.beginPath();
			g.arc(px, py, Math.max(2, T * pt.size), 0, 7);
			g.fill();
		}
		else if (pt.kind === "crumb")
		{
			g.fillStyle = `rgba(${pt.c},${1 - q})`;
			g.beginPath();
			g.arc(px, py, Math.max(1.5, T * pt.size), 0, 7);
			g.fill();
		}
		else
		{
			g.fillStyle = `rgba(255,255,220,${1 - q})`;
			g.fillRect(px - 2, py - 2, 4, 4);
		}
	}
	// floats
	for (const f of fx.floats)
	{
		const q = (now - f.t0) / 1300;
		if (q > 1) continue;
		const [cx, cy] = cxy(f.x, f.y);
		g.font = `bold ${Math.max(13, Math.floor(T * 0.24))}px Alegreya, Georgia, serif`;
		g.textAlign = "center";
		g.textBaseline = "middle";
		const yy = cy - T * 0.5 - q * T * 0.5;
		g.globalAlpha = 1 - q * q;
		g.lineWidth = 4;
		g.strokeStyle = "#f1e4c3";
		g.strokeText(f.text, cx, yy);
		g.fillStyle = f.color;
		g.fillText(f.text, cx, yy);
		g.globalAlpha = 1;
	}
	g.restore();
}

// The board square under a pointer event, laid out as drawBoard lays it out, or null off the board.
export function boardCell(
	cv: HTMLCanvasElement,
	e: PointerEvent,
	S:
	{
		w: number;
		h: number;
	},
):
{
	x: number;
	y: number;
} | null
{
	const r = cv.getBoundingClientRect();
	const W = r.width,
		H = r.height;
	const pad = 10;
	const T = Math.floor(Math.min((W - pad * 2) / S.w, (H - pad * 2) / S.h));
	const ox = Math.floor((W - T * S.w) / 2),
		oy = Math.floor((H - T * S.h) / 2);
	const x = Math.floor((e.clientX - r.left - ox) / T),
		y = Math.floor((e.clientY - r.top - oy) / T);
	if (x < 0 || y < 0 || x >= S.w || y >= S.h) return null;
	return {
		x,
		y,
	};
}
