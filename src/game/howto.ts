import {el} from "./dom.ts";
import {closeModal, mBtn, modal} from "./modal.ts";

// The rules, as the How to play button shows them.
const HOWTO = [
	"<p>You are the dragon. Knights march across the board, and you can read every one of their spells. Write your own spell from blocks, press <b>Run</b>, and watch it all happen step by step.</p>",
	"<h3>Each step</h3><p>You do one action (one square of movement, a turn, a breath of fire, or a wait). Then every knight does its next line of code. Knight code loops forever.</p>",
	"<h3>Your blocks</h3><ul><li><b>When spell run</b>: every spell begins with this yellow block with a magic wand. It stays on top, does nothing by itself, and counts as one block toward the crown.</li><li><b>Move forward</b>: walk ahead. Walls, water, trees and knights block you. Type how many squares.</li><li><b>Take off</b>, then <b>Fly forward</b> over anything. Fly forward does nothing until you have taken off. You stay in the air until you <b>Land</b>.</li><li><b>Breathe fire</b>: burns the square in front of you. <b>Tail whip</b> hits the square behind you. <b>Fireball</b> charges for a step, then flies up to 5 squares. All three only work on the ground.</li><li><b>Repeat</b>, <b>Repeat until</b>, <b>Repeat forever</b> and <b>If</b> make short, smart spells. If and Repeat until can check things like knight ahead, path blocked or knight on my left.</li></ul>",
	"<h3>The knights</h3><ul><li><b>Soldier</b>: attacks the square in front.</li><li><b>Shield knight</b>: blocks one attack from the front, then the shield breaks.</li><li><b>Archer</b>: shoots only flying dragons, 5 squares ahead.</li><li><b>Mounted knight</b>: charges 2 squares at once and tramples.</li><li><b>Spearman</b>: throws his spear up to 2 squares.</li><li><b>Paladin</b>: takes 2 hits.</li><li>Some knights <b>turn to face you</b> or <b>chase you</b>. Watch for those lines in their code.</li></ul>",
	"<h3>Powers and spells</h3><ul><li><b>Fire spin</b>: winds up for a step, then burns all 4 squares around you.</li><li><b>Wing gust</b>: blows the knight in front back 2 squares. Knights blown into water are washed away.</li><li><b>Roar</b>: stuns knights within 3 squares for 3 turns.</li><li><b>Curl up</b>: you take no damage that step.</li><li><b>Define spell</b> and <b>Cast</b>: build your own spell once, then cast it as many times as you like.</li></ul>",
	"<h3>Variables</h3><p>Click <b>Make a variable</b> to create one, like <b>steps</b>. <b>Set</b> and <b>Change</b> blocks update it (they don't use up a step). Drag its orange oval into any number box, like Move forward or Repeat. Blue ovals are things your dragon can sense: distance to wall, knights left, hearts, fireballs left and knight distance. If and Repeat until can compare numbers too.</p>",
	"<h3>Math</h3><p>The green <b>Math</b> ovals do arithmetic: plus, minus, times, divide (rounds down toward zero), mod (the remainder) and abs (absolute value: turns minus numbers positive). Drop one into a number box and fill in its own boxes with numbers, variables or even more math.</p>",
	"<h3>Tacos</h3><p>Walk onto a taco for a giant blast down your whole row or column. It melts shields too, but launches you backwards.</p>",
	"<h3>Stars and crowns</h3><p>Every press of Run is an attempt. Win on your first try for 3 stars, within 3 tries for 2 stars. Win using only a few blocks to earn the level's crown ♛.</p>",
].join("");
export function showHowTo(): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, "How to play"));
		const d = el("div", "howto");
		d.innerHTML = HOWTO;
		c.appendChild(d);
		const r = el("div", "row");
		mBtn(r, "Got it", "fire", closeModal);
		c.appendChild(r);
	});
}
