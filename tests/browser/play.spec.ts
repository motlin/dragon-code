import {expect, type Locator, type Page, test} from "@playwright/test";

// Opens the game and collects page errors.
async function open(page: Page): Promise<string[]>
{
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route(/^https:\/\/fonts\./, async (route) => route.abort());
	await page.goto("/");
	return errors;
}

// Drags an element by the mouse onto a point, in steps, the way a player drags a block.
async function dragTo(
	page: Page,
	from: Locator,
	to:
	{
		x: number;
		y: number;
	},
): Promise<void>
{
	const box = (await from.boundingBox())!;
	await page.mouse.move(box.x + 20, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		to.x,
		to.y,
		{
			steps: 5,
		},
	);
	await page.mouse.up();
}

test("the first campaign level is won by tapping and dragging its spell together and running it", async ({page}) =>
{
	const errors = await open(page);
	await page.locator("#btn-campaign").click();
	await page.locator(".lv").first().click();
	await expect(page.locator("#play-title")).toHaveText("1. First Flame");
	// A tap on a palette block adds it to the end of the spell.
	await page.locator('.palette .blk[data-palette="move"]').click();
	await page.locator("#ws .blk[data-type=move] input.numin").fill("2");
	await page
		.locator(
			".ptab",
			{
				hasText: "Attack",
			},
		)
		.click();
	// Dragging puts the block where it is dropped: here, under Move forward.
	const ws = (await page.locator("#ws").boundingBox())!;
	await dragTo(
		page,
		page.locator('.palette .blk[data-palette="attack"]'),
		{
			x: ws.x + 60,
			y: ws.y + ws.height - 20,
		},
	);
	await expect
		.poll(async () =>
			page.locator("#ws .blk").evaluateAll((blocks) => blocks.map((b) => b.getAttribute("data-type"))),
		)
		.toStrictEqual(["start", "move", "attack"]);
	await expect(page.locator("#blockcount")).toHaveText("3 blocks");
	await page.locator("#speed").click();
	await page.locator("#speed").click();
	await page.locator("#btn-run").click();
	await expect(page.locator("#modal-card h2")).toHaveText(
		"Victory!",
		{
			timeout: 10_000,
		},
	);
	await expect(page.locator("#modal-card .crownline")).toHaveText("♛ Crown earned! You used just 3 blocks.");
	expect(errors).toStrictEqual([]);
});

test("the home screen leads to the campaign map, the Level Forge and the gallery, and back", async ({page}) =>
{
	const errors = await open(page);
	await page.locator("#btn-campaign").click();
	await expect(page.locator("#scr-map h2")).toHaveText("The Campaign");
	await expect(page.locator(".chapter h3")).toHaveText(["Training Grounds", "The Kingdom"]);
	await expect(page.locator(".lv:not(.locked)")).toHaveCount(1);
	await expect(page.locator("#map-stars")).toHaveText("★ 0 / 165   ♛ 0 / 55   Blocks: 2 / 23");
	await page.locator("#map-back").click();
	await page.locator("#btn-editor").click();
	await expect(page.locator("#scr-editor h2")).toHaveText("Level Forge");
	await expect(page.locator("#tools .tool")).toHaveCount(13);
	await expect(page.locator("#ed-msg")).toHaveText(
		"Next: test your level and beat it yourself to unlock publishing.",
	);
	await page.locator("#ed-back").click();
	await page.locator("#btn-gallery").click();
	await expect(page.locator("#scr-gallery h3")).toHaveText(["Player levels", "Hall of Flames"]);
	await page.locator("#gal-back").click();
	await expect(page.locator("#scr-home")).toBeVisible();
	expect(errors).toStrictEqual([]);
});
