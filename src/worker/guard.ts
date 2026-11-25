import type {Env} from "./env.ts";

// Decides whether a request that changes the gallery or the high scores comes from a person, after its body is valid
// and before it counts toward the rate limits. False refuses it with 403.
//
// This is the one place to add bot protection later without touching the handlers: verify a Turnstile token against
// https://challenges.cloudflare.com/turnstile/v0/siteverify with a secret binding added to Env, or check the
// Cf-Access-Jwt-Assertion header that Cloudflare Access adds. Today every request is let through.
export type HumanCheck = (request: Request, env: Env) => boolean | Promise<boolean>;

export const verifyHuman: HumanCheck = () => true;
