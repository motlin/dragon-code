// The element a selector names. The markup in index.html always has it, so a miss is a bug, as it was in the original.
export const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;

// The element a selector names, which has to be of the given kind, such as an input or a canvas.
export function $as<T extends Element>(selector: string, kind: new () => T): T
{
	const found = document.querySelector(selector);
	if (!(found instanceof kind)) throw new Error(`${selector} is missing or the wrong kind of element`);
	return found;
}

export const $$ = (selector: string): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(selector)];

// A new element with an optional class and text.
export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	cls?: string | null,
	txt?: string | null,
): HTMLElementTagNameMap[K]
{
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (txt !== null && txt !== undefined) e.textContent = txt;
	return e;
}

// The nearest element around an event's target that matches the selector.
export function closest(event: Event, selector: string): HTMLElement | null
{
	const found = event.target instanceof Element ? event.target.closest(selector) : null;
	return found instanceof HTMLElement ? found : null;
}

export const context2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => canvas.getContext("2d")!;

// A listener that starts an async action and lets it finish on its own, as the original's handlers did.
export const later =
	(fn: () => Promise<void>): (() => void) =>
	(): void =>
	{
		void fn();
	};
