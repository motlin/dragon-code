import {$, el} from "./dom.ts";

// The one dialog: build fills its card, and its first button takes the focus.
export function modal(build: (card: HTMLElement) => void): void
{
	const m = $("#modal"),
		c = $("#modal-card");
	c.innerHTML = "";
	build(c);
	m.classList.remove("hidden");
	const b = c.querySelector("button");
	if (b)
		setTimeout(() =>
		{
			b.focus();
		}, 30);
}
export function closeModal(): void
{
	$("#modal").classList.add("hidden");
}
export function mBtn(row: HTMLElement, txt: string, cls: string, fn: () => unknown): HTMLButtonElement
{
	const b = el("button", `btn ${cls}`, txt);
	b.addEventListener("click", (): void =>
	{
		void fn();
	});
	row.appendChild(b);
	return b;
}
// A dialog with a heading, its paragraphs and an OK button.
export function notice(title: string, ...text: string[]): void
{
	modal((c) =>
	{
		c.appendChild(el("h2", null, title));
		for (const t of text) c.appendChild(el("p", null, t));
		const r = el("div", "row");
		mBtn(r, "OK", "fire", closeModal);
		c.appendChild(r);
	});
}
