import {expect, test} from "@playwright/test";

test("the game loads, draws the home screen's dragon and reports no errors", async ({page}) =>
{
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await expect(page.locator("h1.home-title")).toHaveText("Dragon Code");
	await expect(page.locator("#home-canvas")).toBeVisible();
	await expect.poll(async () => page.locator("#home-canvas").evaluate(drawnPixels)).toBeGreaterThan(0);
	expect(errors).toStrictEqual([]);
});

// How many of the canvas's pixels the game has painted.
function drawnPixels(canvas: HTMLCanvasElement): number
{
	const {data} = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
	let painted = 0;
	for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) painted++;
	return painted;
}
