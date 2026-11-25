import {expect, test} from "@playwright/test";

const DRAFT =
{
	name: "",
	w: 5,
	h: 3,
	map: [".....", ".....", "....."],
	dragon:
	{
		x: 0,
		y: 1,
		d: 1,
	},
	knights: [
		{
			type: "soldier",
			x: 3,
			y: 1,
			d: 3,
			prog: "W",
		},
	],
	beaten: true,
};

test("a level the player beat publishes from the forge and shows first in the gallery, beside the shared scores", async ({
	page,
}) =>
{
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route(/^https:\/\/fonts\./, async (route) => route.abort());
	// A returning player named Bob, whose forged level is already beaten.
	await page.addInitScript((draft) =>
	{
		localStorage.setItem("dc_nick", JSON.stringify("Bob"));
		localStorage.setItem("dc_draft", JSON.stringify(draft));
	}, DRAFT);
	await page.goto("/");
	await page.locator("#btn-editor").click();
	await expect(page.locator("#ed-msg")).toHaveText("Ready! You beat it. Publish it to the gallery.");
	const name = "Bob's Field";
	await page.locator("#ed-name").fill(name);
	await page.locator("#ed-publish").click();
	await expect(page.locator("#modal-card h2")).toHaveText("Published!");
	await page
		.getByRole(
			"button",
			{
				name: "See the gallery",
			},
		)
		.click();
	await expect(page.locator(".gcard").first().locator(".gn")).toHaveText(name);
	await expect(page.locator(".gcard").first().locator(".gm")).toHaveText("by Bob · 5×3 · 1 knight");
	await expect(page.locator(".gcard").first().getByRole("button")).toHaveText(["Play", "Delete"]);
	await expect(
		page
			.locator(
				".gcard",
				{
					hasText: "Gauntlet",
				},
			)
			.locator(".gm"),
	).toHaveText("by Bob · 4×3 · 1 knight");
	await expect(page.locator("#lb-body tr")).toHaveText([/1\s*Alice\s*7/, /2\s*Bob\s*4/]);
	expect(errors).toStrictEqual([]);
});
