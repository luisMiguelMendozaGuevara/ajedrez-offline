"use client";

// Lightweight sound effects using the Web Audio API (no audio files needed).
// Also provides haptic feedback via the Vibration API.

type SoundName = "move" | "capture" | "check" | "castle" | "select" | "gameEnd" | "invalid";

let audioCtx: AudioContext | null = null;

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

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  ensureResumed();
  switch (name) {
    case "move":
      tone(320, 80, "triangle", 0.1);
      break;
    case "capture":
      tone(220, 120, "sawtooth", 0.14);
      tone(140, 160, "square", 0.08, 0.02);
      break;
    case "check":
      tone(660, 100, "square", 0.1);
      tone(880, 120, "square", 0.1, 0.08);
      break;
    case "castle":
      tone(400, 70, "triangle", 0.1);
      tone(500, 70, "triangle", 0.1, 0.06);
      break;
    case "select":
      tone(540, 45, "sine", 0.05);
      break;
    case "gameEnd":
      tone(523, 140, "triangle", 0.12);
      tone(659, 140, "triangle", 0.12, 0.12);
      tone(784, 220, "triangle", 0.12, 0.24);
      break;
    case "invalid":
      tone(180, 90, "square", 0.08);
      break;
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
