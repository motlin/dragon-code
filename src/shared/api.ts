import type {Level} from "../game/engine.ts";
import {sanitizeLevel} from "./level.ts";

// The shapes /api/levels and /api/scores send and accept, and the checks the Worker runs on what it accepts. The game
// in src/game/api.ts and the Worker in src/worker/ both use them.

// Every request that changes something names its player in this header: a random id the device made once and keeps in
// localStorage as dc_player.
export const PLAYER_HEADER = "x-player-id";
const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;
export const isPlayerId = (id: string | null): id is string => id !== null && PLAYER_ID.test(id);

const NAME_MAX = 40;
const NICK_MAX = 24;
const BEST_MAX = 100_000;

export interface GalleryLevel
{
	id: string;
	name: string;
	nick: string;
	created: number;
	data: Level;
	mine: boolean;
}
export interface ScoreRow
{
	nick: string;
	best: number;
	mine: boolean;
}

export interface Publish
{
	name: string;
	nick: string;
	data: Level;
}
export interface ScoreSubmission
{
	best: number;
	nick: string;
}
export type Validation<T> =
	|
	  {
			ok: true;
			value: T;
	  }
	|
	  {
			ok: false;
			error: string;
	  };

const fail = <T>(error: string): Validation<T> => (
{
	ok: false,
	error,
});
// oxlint-disable-next-line no-control-regex -- names and nicknames must not hold control characters
const CONTROL = /[\u0000-\u001f\u007f]/;
function text(value: unknown, field: string, min: number, max: number): Validation<string>
{
	const trimmed = typeof value === "string" ? value.trim() : null;
	if (trimmed === null || trimmed.length < min || trimmed.length > max)
		return fail(`${field} must be ${min} to ${max} characters`);
	if (CONTROL.test(trimmed)) return fail(`${field} must not contain control characters`);
	return {
		ok: true,
		value: trimmed,
	};
}
const isObject = (body: unknown): body is object => typeof body === "object" && body !== null && !Array.isArray(body);

export function validatePublish(body: unknown): Validation<Publish>
{
	if (!isObject(body)) return fail("body must be a JSON object");
	const name = text(Reflect.get(body, "name"), "name", 1, NAME_MAX);
	if (!name.ok) return name;
	const nick = text(Reflect.get(body, "nick") ?? "", "nick", 0, NICK_MAX);
	if (!nick.ok) return nick;
	const data = sanitizeLevel(Reflect.get(body, "data"));
	if (!data) return fail("data is not a playable level");
	return {
		ok: true,
		value:
		{
			name: name.value,
			nick: nick.value,
			data,
		},
	};
}

export function validateScore(body: unknown): Validation<ScoreSubmission>
{
	if (!isObject(body)) return fail("body must be a JSON object");
	const best: unknown = Reflect.get(body, "best");
	if (typeof best !== "number" || !Number.isSafeInteger(best) || best < 1 || best > BEST_MAX)
		return fail(`best must be a whole number from 1 to ${BEST_MAX}`);
	const nick = text(Reflect.get(body, "nick") ?? "", "nick", 0, NICK_MAX);
	if (!nick.ok) return nick;
	return {
		ok: true,
		value:
		{
			best,
			nick: nick.value,
		},
	};
}
