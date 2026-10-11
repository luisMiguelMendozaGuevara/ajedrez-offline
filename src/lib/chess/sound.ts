"use client";

// Sound effects generated with the Web Audio API (no audio files needed).
// Wooden "knocks" are synthesized as a filtered noise transient plus a short
// low sine body, which sounds like a chess piece landing on the board.
// Also provides haptic feedback via the Vibration API.

export type SoundName =
  | "start"
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "select"
  | "gameEnd"
  | "invalid"
  | "click"
  | "hint";

let audioCtx: AudioContext | null = null;
let moveToggle = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// Resume audio context on first user gesture (browsers require this)
function ensureResumed(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.12,
  startAt = 0
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

// Short burst of filtered noise: the wooden "attack" of a knock or a tick.
function noiseHit(
  durationMs: number,
  freq: number,
  gain: number,
  startAt = 0,
  q = 1,
  type: BiquadFilterType = "bandpass"
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + startAt;
  const dur = durationMs / 1000;
  const length = Math.max(1, Math.floor(ctx.sampleRate * (dur + 0.02)));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, now);
  filter.Q.setValueAtTime(q, now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(now);
  src.stop(now + dur + 0.03);
}

// One chess piece landing on the wooden board.
function knock(freq: number, startAt = 0, gain = 0.15, decayMs = 85): void {
  tone(freq, decayMs, "sine", gain, startAt);
  tone(freq * 2.7, decayMs * 0.45, "triangle", gain * 0.22, startAt);
  noiseHit(26, Math.min(freq * 7, 5200), gain * 0.8, startAt, 0.9);
}

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  ensureResumed();
  switch (name) {
    case "start": {
      // Setting up the board: 16 pawns placed in quick rows, then the 16
      // pieces, ending with a soft warm chord. Slightly humanized timing.
      const rnd = (a: number) => (Math.random() - 0.5) * a;
      let at = 0.06;
      for (let i = 0; i < 16; i++) {
        knock(235 + rnd(26), at + rnd(0.012), 0.08, 62);
        at += 0.045;
      }
      at += 0.08;
      for (let i = 0; i < 16; i++) {
        knock(188 + rnd(22), at + rnd(0.014), 0.1, 78);
        at += 0.052;
      }
      const end = at + 0.12;
      tone(392, 260, "triangle", 0.055, end);
      tone(493.88, 260, "triangle", 0.05, end + 0.03);
      tone(587.33, 340, "triangle", 0.05, end + 0.06);
      break;
    }
    case "move": {
      // Alternate the pitch a little so consecutive moves feel organic.
      moveToggle = 1 - moveToggle;
      knock((moveToggle ? 196 : 172) + (Math.random() - 0.5) * 10, 0, 0.15, 80);
      break;
    }
    case "capture": {
      knock(150, 0, 0.2, 120);
      noiseHit(90, 900, 0.15, 0, 0.7, "lowpass");
      knock(112, 0.03, 0.13, 150);
      break;
    }
    case "castle": {
      knock(205, 0, 0.14, 75);
      knock(190, 0.085, 0.14, 80);
      break;
    }
    case "check": {
      knock(215, 0, 0.15, 85);
      tone(1046.5, 90, "triangle", 0.07, 0.09);
      tone(1318.5, 150, "triangle", 0.08, 0.19);
      break;
    }
    case "select": {
      noiseHit(16, 3200, 0.045, 0, 1.4);
      tone(1450, 26, "sine", 0.035);
      break;
    }
    case "invalid": {
      tone(155, 110, "square", 0.055);
      tone(124, 130, "square", 0.05, 0.07);
      break;
    }
    case "gameEnd": {
      tone(392, 150, "triangle", 0.09, 0);
      tone(523.25, 150, "triangle", 0.09, 0.14);
      tone(659.25, 150, "triangle", 0.09, 0.28);
      tone(783.99, 280, "triangle", 0.1, 0.42);
      tone(196, 520, "sine", 0.05, 0.42);
      break;
    }
    case "click": {
      noiseHit(14, 2600, 0.05, 0, 1.3);
      tone(920, 28, "sine", 0.03);
      break;
    }
    case "hint": {
      tone(1046.5, 70, "sine", 0.055, 0);
      tone(1568, 70, "sine", 0.05, 0.07);
      tone(2093, 130, "sine", 0.045, 0.14);
      noiseHit(120, 5200, 0.02, 0.14, 0.8);
      break;
    }
  }
}

export function playHaptic(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
