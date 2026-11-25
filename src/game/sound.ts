import {prefs} from "./store.ts";

// Sound effects made on the fly with Web Audio, nothing to download.
let AC: AudioContext | null = null;
export function audio(): AudioContext | null
{
	if (prefs.muted) return null;
	try
	{
		AC ??= new AudioContext();
		if (AC.state === "suspended") void AC.resume();
	}
	catch
	{
		AC = null;
	}
	return AC;
}
function noise(dur: number, f: number, q: number, vol: number): void
{
	const a = audio();
	if (!a) return;
	const n = a.createBufferSource();
	const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
	const d = b.getChannelData(0);
	for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
	n.buffer = b;
	const fl = a.createBiquadFilter();
	fl.type = "bandpass";
	fl.frequency.value = f;
	fl.Q.value = q;
	const g = a.createGain();
	g.gain.value = vol;
	n.connect(fl);
	fl.connect(g);
	g.connect(a.destination);
	n.start();
}
function tone(f: number, dur: number, type: OscillatorType = "square", vol = 0.08, slide = 0): void
{
	const a = audio();
	if (!a) return;
	const o = a.createOscillator();
	const g = a.createGain();
	o.type = type;
	o.frequency.setValueAtTime(f, a.currentTime);
	if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
	g.gain.setValueAtTime(vol, a.currentTime);
	g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
	o.connect(g);
	g.connect(a.destination);
	o.start();
	o.stop(a.currentTime + dur);
}
const SFX =
{
	fire(): void
	{
		noise(0.45, 700, 0.8, 0.5);
	},
	blast(): void
	{
		noise(1.1, 400, 0.5, 0.8);
		tone(120, 0.8, "sawtooth", 0.06, 600);
	},
	hit(): void
	{
		tone(180, 0.25, "square", 0.12, 70);
	},
	clang(): void
	{
		tone(1200, 0.18, "triangle", 0.12);
		setTimeout(() =>
		{
			tone(1500, 0.15, "triangle", 0.08);
		}, 40);
	},
	arrow(): void
	{
		tone(1800, 0.15, "sine", 0.05, 900);
	},
	burn(): void
	{
		noise(0.6, 1200, 1.5, 0.3);
	},
	step(): void
	{
		tone(220, 0.05, "triangle", 0.03);
	},
	flap(): void
	{
		noise(0.15, 300, 2, 0.15);
	},
	win(): void
	{
		[523, 659, 784, 1046].forEach((f, i) =>
			setTimeout(() =>
			{
				tone(f, 0.25, "triangle", 0.1);
			}, i * 120),
		);
	},
	lose(): void
	{
		[392, 330, 262, 196].forEach((f, i) =>
			setTimeout(() =>
			{
				tone(f, 0.3, "square", 0.06);
			}, i * 150),
		);
	},
	click(): void
	{
		tone(660, 0.04, "triangle", 0.04);
	},
	whip(): void
	{
		noise(0.18, 1600, 2, 0.35);
		tone(500, 0.12, "sawtooth", 0.04, 150);
	},
	charge(): void
	{
		tone(200, 0.35, "sawtooth", 0.05, 600);
	},
	roar(): void
	{
		tone(110, 0.6, "sawtooth", 0.12, 60);
		noise(0.5, 300, 0.7, 0.4);
	},
	gust(): void
	{
		noise(0.5, 900, 0.6, 0.35);
	},
	splash(): void
	{
		noise(0.4, 1800, 1, 0.35);
		tone(600, 0.15, "sine", 0.05, 200);
	},
	chomp(): void
	{
		[0, 170, 340].forEach((t) =>
			setTimeout(() =>
			{
				noise(0.09, 900, 1.2, 0.35);
				tone(140, 0.07, "square", 0.05, 90);
			}, t),
		);
	},
	taco(): void
	{
		tone(440, 0.12, "square", 0.07, 880);
		setTimeout(() =>
		{
			tone(660, 0.12, "square", 0.07, 1320);
		}, 100);
	},
};
export function sfx(n: keyof typeof SFX): void
{
	try
	{
		SFX[n]();
	}
	catch
	{
		// A sound that fails to play is skipped, as in the original.
	}
}
