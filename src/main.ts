import {initHome, initHooks, initKeys, initPlay, start} from "./game/app.ts";
import {initDnD} from "./game/dnd.ts";
import {initEditor} from "./game/editor.ts";
import {initBoardHover} from "./game/knights.ts";
import {initResize} from "./game/screens.ts";
import {registerServiceWorker} from "./pwa/register.ts";

// Boots the game in the order the artifact's init ran: the screens wired together, drag and drop, the forge, the
// buttons, the board's knight hover and the keys, then the home screen. Each part starts on its own, so a failure in
// one leaves the others working.
for (const init of [initHooks, initResize, initDnD, initEditor, initHome, initPlay, initBoardHover, initKeys, start])
{
	try
	{
		init();
	}
	catch (error)
	{
		reportError(error);
	}
}
registerServiceWorker();
