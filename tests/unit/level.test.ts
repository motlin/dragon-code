import {expect, it} from "vite-plus/test";
import {sanitizeLevel} from "../../src/shared/level.ts";

const valid =
{
	w: 4,
	h: 3,
	map: ["..#.", ".~T.", "t.,."],
	dragon:
	{
		x: 0,
		y: 0,
		d: 1,
	},
	knights: [
		{
			type: "archer",
			x: 3,
			y: 2,
			d: 3,
			prog: "TGA",
		},
	],
};

it("keeps a valid level's board, dragon and knights, truncating numbers and wrapping directions as the artifact did", () =>
{
	expect(
		sanitizeLevel(
			{
				...valid,
				w: "4",
				h: 3.9,
				name: "dropped",
				dragon:
				{
					x: 0.5,
					y: 0,
					d: 5,
				},
				knights: [
					{
						...valid.knights[0],
						d: -1,
						extra: true,
					},
				],
			},
		),
	).toStrictEqual(
		{
			...valid,
			dragon:
			{
				x: 0,
				y: 0,
				d: 1,
			},
		},
	);
});

it("refuses levels the game could not play", () =>
{
	const knight = valid.knights[0]!;
	expect(
		[
			null,
			"level",
			{
				...valid,
				w: 2,
			},
			{
				...valid,
				w: 13,
			},
			{
				...valid,
				map: ["..#.", ".~T."],
			},
			{
				...valid,
				map: ["..#.", ".~T.", "t.D."],
			},
			{
				...valid,
				map: ["..#.", ".~T.", "t.."],
			},
			{
				...valid,
				dragon: null,
			},
			{
				...valid,
				dragon:
				{
					x: 4,
					y: 0,
					d: 0,
				},
			},
			{
				...valid,
				knights: [],
			},
			{
				...valid,
				knights: Array.from(
					{
						length: 21,
					},
					() => knight,
				),
			},
			{
				...valid,
				knights: [
					{
						...knight,
						type: "wizard",
					},
				],
			},
			{
				...valid,
				knights: [
					{
						...knight,
						prog: "FX",
					},
				],
			},
			{
				...valid,
				knights: [
					{
						...knight,
						prog: "F".repeat(17),
					},
				],
			},
			{
				...valid,
				knights: [
					{
						...knight,
						y: 3,
					},
				],
			},
		].map(sanitizeLevel),
	).toStrictEqual(
		Array.from(
			{
				length: 15,
			},
			() => null,
		),
	);
});
