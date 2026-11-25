import {readFileSync} from "node:fs";
import {expect, it} from "vite-plus/test";
import {MANIFEST} from "../../src/pwa/manifest.ts";

const root = new URL("../../", import.meta.url);
const read = (path: string): Buffer => readFileSync(new URL(path, root));

// A PNG's width and height are the two big-endian words right after the IHDR chunk type, at bytes 16 and 20.
function pngSize(path: string): [number, number]
{
	const png = read(path);
	expect(png.subarray(12, 16).toString("latin1")).toBe("IHDR");
	return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

// A JPEG's height and width follow the start-of-frame marker; markers before it carry their own lengths.
function jpegSize(path: string): [number, number]
{
	const jpeg = read(path);
	let i = 2;
	while (jpeg[i + 1] !== 0xc0 && jpeg[i + 1] !== 0xc2) i += 2 + jpeg.readUInt16BE(i + 2);
	return [jpeg.readUInt16BE(i + 7), jpeg.readUInt16BE(i + 5)];
}

const html = (): string => read("index.html").toString("utf8");

function head(): string[]
{
	return [...html().matchAll(/<(?:meta (?:name|property)="[^"]+"|link rel="(?:icon|apple-touch-icon)")[^>]*>/g)].map(
		([tag]) => tag,
	);
}

const DESCRIPTION =
	"In every fairy tale the knights storm the dragon's castle. This time, you are the dragon. Read their code, write your own spell from blocks, and burn them all.";

it("gives link previews a title, description and an absolute image URL, and links the icons", () =>
{
	expect(head()).toStrictEqual([
		`<meta name="viewport" content="width=device-width, initial-scale=1">`,
		`<meta name="description" content="${DESCRIPTION}">`,
		`<meta property="og:type" content="website">`,
		`<meta property="og:site_name" content="Dragon Code">`,
		`<meta property="og:title" content="Dragon Code">`,
		`<meta property="og:description" content="${DESCRIPTION}">`,
		`<meta property="og:url" content="https://dragon-code.motlin.com/">`,
		`<meta property="og:image" content="https://dragon-code.motlin.com/og.jpg">`,
		`<meta property="og:image:width" content="1200">`,
		`<meta property="og:image:height" content="630">`,
		`<meta property="og:image:alt" content="A green dragon breathing fire at a soldier on a grass board, beside the title Dragon Code and a spell of blocks: When spell run, Repeat 3, Move forward, Breathe fire">`,
		`<meta name="twitter:card" content="summary_large_image">`,
		`<meta name="twitter:title" content="Dragon Code">`,
		`<meta name="twitter:description" content="${DESCRIPTION}">`,
		`<meta name="twitter:image" content="https://dragon-code.motlin.com/og.jpg">`,
		`<meta name="theme-color" content="#2a2438">`,
		`<meta name="mobile-web-app-capable" content="yes">`,
		`<meta name="apple-mobile-web-app-capable" content="yes">`,
		`<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
		`<meta name="apple-mobile-web-app-title" content="Dragon Code">`,
		`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
		`<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
	]);
});

// WhatsApp is reported to drop preview images over 300KB.
const MAX_PREVIEW_BYTES = 300_000;

it("ships the preview card at 1200x630 and the icons the page links", () =>
{
	expect(
		{
			size: jpegSize("public/og.jpg"),
			small: read("public/og.jpg").length <= MAX_PREVIEW_BYTES,
			touch: pngSize("public/icons/apple-touch-icon.png"),
			favicon: read("public/favicon.svg").toString("utf8").startsWith("<svg "),
		},
	).toStrictEqual(
		{
			size: [1200, 630],
			small: true,
			touch: [180, 180],
			favicon: true,
		},
	);
});

// The status bar and the installed app's splash screen take the night sky behind the storybook pages.
it("paints the page in the color its toolbar and app use", () =>
{
	expect(/--night:(#\w+);/.exec(read("src/styles/game.css").toString("utf8"))?.[1]).toBe(MANIFEST.theme_color);
});
