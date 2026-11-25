import type {BlockType} from "./engine.ts";

// The 16 by 16 pictures on the blocks, and the heart in the HUD. Set and Change have none.
const ICON: Partial<Record<BlockType, string>> =
{
	move: '<path d="M8 2 L13 8 L10 8 L10 14 L6 14 L6 8 L3 8 Z" fill="currentColor"/>',
	fly: '<path d="M8 3 C5 6 2 6 1 5 C2 9 5 10 8 9 C11 10 14 9 15 5 C14 6 11 6 8 3 Z" fill="currentColor"/>',
	takeoff: '<path d="M8 1 L13 7 H10 V11 H6 V7 H3 Z M3 13 H13 V15 H3 Z" fill="currentColor"/>',
	land: '<path d="M8 12 L13 6 H10 V1 H6 V6 H3 Z M3 13 H13 V15 H3 Z" fill="currentColor"/>',
	left: '<path d="M6 3 L1 7 L6 11 V8 H10 A3 3 0 0 1 10 14 H8 V16 H10 A5 5 0 0 0 10 6 H6 Z" fill="currentColor"/>',
	right: '<path d="M10 3 L15 7 L10 11 V8 H6 A3 3 0 0 0 6 14 H8 V16 H6 A5 5 0 0 1 6 6 H10 Z" fill="currentColor"/>',
	attack: '<path d="M8 1 C9 4 13 6 13 10 A5 5 0 0 1 3 10 C3 7 5 6 6 4 C6 6 7 7 8 7 C8 5 7 3 8 1 Z" fill="currentColor"/>',
	wait: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 4 V8 L11 10" stroke="currentColor" stroke-width="2" fill="none"/>',
	repeat: '<path d="M3 8 A5 5 0 0 1 12 5 L10 5 L13 2 L15 6 L13 5.5 M13 8 A5 5 0 0 1 4 11 L6 11 L3 14 L1 10 L3 10.5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
	if: '<path d="M8 1 L15 8 L8 15 L1 8 Z" fill="none" stroke="currentColor" stroke-width="2"/><text x="8" y="11.5" font-size="9" text-anchor="middle" fill="currentColor" font-weight="bold">?</text>',
	around: '<path d="M4 9 A4 4 0 1 1 12 9 L12 12 M12 12 L9 9.5 M12 12 L14.5 9" stroke="currentColor" stroke-width="2" fill="none"/>',
	whip: '<path d="M2 3 C8 3 12 6 12 9 C12 12 9 13 7 12 C9 12 10 11 10 9.5 C10 7 6 5 2 5 Z" fill="currentColor"/><path d="M11 12 L15 15" stroke="currentColor" stroke-width="2"/>',
	fireball:
		'<circle cx="10" cy="8" r="4.5" fill="currentColor"/><path d="M1 6 H5 M0 9 H5 M2 12 H6" stroke="currentColor" stroke-width="1.6"/>',
	until: '<path d="M3 8 A5 5 0 0 1 12 5 L10 5 L13 2 L15 6 L13 5.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M6 11 L8 13 L13 8" stroke="currentColor" stroke-width="1.8" fill="none"/>',
	forever:
		'<path d="M2 8 C2 4 6 4 8 8 C10 12 14 12 14 8 C14 4 10 4 8 8 C6 12 2 12 2 8 Z" stroke="currentColor" stroke-width="1.8" fill="none"/>',
	gust: '<path d="M1 5 H10 A2.5 2.5 0 1 0 7.5 2.5 M1 9 H13 A2.5 2.5 0 1 1 10.5 11.5 M1 13 H7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
	roar: '<path d="M2 6 H5 L9 2 V14 L5 10 H2 Z" fill="currentColor"/><path d="M11 5 Q13 8 11 11 M13 3 Q16 8 13 13" stroke="currentColor" stroke-width="1.6" fill="none"/>',
	curl: '<path d="M8 1 L14 3.5 V8 C14 11.5 11 14 8 15 C5 14 2 11.5 2 8 V3.5 Z" fill="currentColor"/>',
	firespin:
		'<circle cx="8" cy="8" r="2.4" fill="currentColor"/><path d="M8 1 L9.5 4 H6.5 Z M15 8 L12 9.5 V6.5 Z M8 15 L6.5 12 H9.5 Z M1 8 L4 6.5 V9.5 Z" fill="currentColor"/>',
	define: '<path d="M3 2 H11 L13 4 V14 H3 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 6 H11 M5 9 H11 M5 12 H9" stroke="currentColor" stroke-width="1.4"/>',
	cast: '<path d="M2 14 L9 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 1 L13 4 L16 5 L13 6 L12 9 L11 6 L8 5 L11 4 Z" fill="currentColor"/>',
	start: '<path d="M2 14.5 L9.2 7.3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M2 14.5 L4 12.5" stroke="#fffaf0" stroke-width="2.2" stroke-linecap="round"/><path d="M11.5 1.2 L12.4 3.8 L15 4.1 L13 5.8 L13.6 8.4 L11.5 7 L9.4 8.4 L10 5.8 L8 4.1 L10.6 3.8 Z" fill="currentColor"/><circle cx="5.5" cy="3" r="0.9" fill="currentColor"/><circle cx="14.6" cy="11" r="0.8" fill="currentColor"/>',
};
export const svgIcon = (t: BlockType): string => `<svg viewBox="0 0 16 16" aria-hidden="true">${ICON[t] ?? ""}</svg>`;
export const HEART =
	'<svg viewBox="0 0 24 22"><path d="M12 21 C5 15 1 11 1 6.5 A5.5 5.5 0 0 1 12 4 A5.5 5.5 0 0 1 23 6.5 C23 11 19 15 12 21 Z" fill="FILL" stroke="#3b2716" stroke-width="1.6"/></svg>';
