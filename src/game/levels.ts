import {KINGDOM} from "./levels/kingdom.ts";
import {TUTORIAL} from "./levels/tutorial.ts";

// The campaign: the Training Grounds, then the Kingdom.
export const LEVELS = TUTORIAL.concat(KINGDOM);
export const NT = TUTORIAL.length;
