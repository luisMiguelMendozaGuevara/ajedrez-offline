"use client";

// Procedural background music built entirely with the Web Audio API
// (no audio files, no external licenses). Four original tracks:
//   - "vintage": slow 3/4 waltz (Am-Dm-E7-Am / Dm-F-E7-Am) played with
//     music-box triangle arpeggios, a plucked "harpsichord" (square with a
//     fast decay) and a soft sustained bass. An old chess-club mood.
//   - "retro": upbeat 8-bit loop in 4/4 (C-G-Am-F) with a square lead melody,
//     square bass and noise hi-hats.
//   - "classical": baroque chamber loop in 4/4 (~76 BPM, 8 bars) over a
//     Pachelbel-style progression in D (D-A-Bm-F#m-G-D-G-A): harpsichord
//     arpeggios, a soft lowpassed string pad and a pizzicato bass.
//   - "rock": chiptune-rock loop in 4/4 (~112 BPM, 4 bars) in E minor
//     (Em-C-G-D): pentatonic square lead with syncopation, detuned saw
//     "power chords" through a gentle waveshaper, driving square bass in
//     eighths and a drum kit (kick, snare, hats).
//
// SSR-safe: the single AudioContext is created lazily and only resumed
// inside user gestures (autoplay policies). A lookahead scheduler
// (setInterval + schedule-ahead window) keeps timing accurate without
// relying on per-note timers.

import { loadSettings } from "./storage";

export type MusicTrackId = "vintage" | "retro" | "classical" | "rock";

const MASTER_VOLUME = 0.07;
const LOOKAHEAD_MS = 100; // scheduler wake-up interval
const SCHEDULE_AHEAD_S = 0.6; // how far ahead notes are scheduled
const SWITCH_FADE_S = 0.25;
const STOP_FADE_S = 0.4;

// ---------- AudioContext (lazy singleton) ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      noiseBuffer = createNoiseBuffer(ctx);
    } catch {
      return null;
    }
  }
  return ctx;
}

function createNoiseBuffer(audio: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(audio.sampleRate * 0.25));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ---------- Helpers ----------

const SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const freqCache = new Map<string, number>();

function freqOf(note: string): number {
  const cached = freqCache.get(note);
  if (cached !== undefined) return cached;
  const match = /^([A-G])(#?)(-?\d)$/.exec(note);
  let freq = 0;
  if (match) {
    const semitone = SEMITONES[match[1]] + (match[2] ? 1 : 0);
    const midi = (parseInt(match[3], 10) + 1) * 12 + semitone;
    freq = 440 * Math.pow(2, (midi - 69) / 12);
  }
  freqCache.set(note, freq);
  return freq;
}

interface NoteOptions {
  freq: number;
  time: number;
  dur: number; // seconds
  gain: number; // peak gain before the master bus
  type: OscillatorType;
  decay?: "pluck" | "sustain";
  release?: number; // release time for sustained notes
}

function playNote(opts: NoteOptions): void {
  if (!ctx || !master) return;
  const { freq, time, dur, gain, type } = opts;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  const attack = Math.min(0.012, dur * 0.2);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(gain, time + attack);
  if (opts.decay === "sustain") {
    const release = Math.min(opts.release ?? 0.08, dur * 0.5);
    g.gain.setValueAtTime(gain, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  }
  osc.connect(g);
  g.connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

function playNoise(time: number, dur: number, gain: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(6500, time);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(master);
  src.start(time);
  src.stop(time + dur + 0.02);
}

// Soft string-pad voice: sawtooth through a lowpass with a slow attack and
// a long sustain, used by the classical track to hold each chord.
function playPadNote(freq: number, time: number, dur: number, gain: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1200, time);
  const g = ctx.createGain();
  const attack = Math.min(0.4, dur * 0.2);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(gain, time + attack);
  g.gain.setValueAtTime(gain, time + Math.max(attack, dur - 0.45));
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(lp);
  lp.connect(g);
  g.connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

// ---------- Track: vintage (slow 3/4 waltz, ~92 BPM) ----------

const VINTAGE_STEPS_PER_BAR = 6; // eighth notes
const VINTAGE_CHORDS: { bass: string; arp: string[] }[] = [
  { bass: "A2", arp: ["A3", "C4", "E4"] }, // Am
  { bass: "D3", arp: ["D4", "F4", "A4"] }, // Dm
  { bass: "E3", arp: ["E4", "G#4", "B4", "D5"] }, // E7
  { bass: "A2", arp: ["A3", "C4", "E4"] }, // Am
  { bass: "D3", arp: ["D4", "F4", "A4"] }, // Dm
  { bass: "F3", arp: ["F3", "A3", "C4", "E4"] }, // Fmaj7
  { bass: "E3", arp: ["E4", "G#4", "B4", "D5"] }, // E7
  { bass: "A2", arp: ["A3", "C4", "E4"] }, // Am
];

function vintageArpIndex(inBar: number, chordLength: number): number {
  switch (inBar) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
      return chordLength > 3 ? 3 : 1;
    default:
      return chordLength > 3 ? 2 : 1;
  }
}

function scheduleVintageStep(step: number, time: number): void {
  const inBar = step % VINTAGE_STEPS_PER_BAR;
  const chord = VINTAGE_CHORDS[(step - inBar) / VINTAGE_STEPS_PER_BAR];
  if (!chord) return;

  if (inBar === 0) {
    // soft sustained bass on the downbeat
    playNote({
      freq: freqOf(chord.bass),
      time,
      dur: 0.62,
      gain: 0.5,
      type: "triangle",
      decay: "sustain",
      release: 0.14,
    });
    return;
  }

  const note = chord.arp[vintageArpIndex(inBar, chord.arp.length)];
  const plucked = inBar % 2 === 1; // clave on the off-beats
  playNote({
    freq: freqOf(note),
    time,
    dur: plucked ? 0.2 : 0.45,
    gain: plucked ? 0.22 : 0.3,
    type: plucked ? "square" : "triangle",
    decay: "sustain",
    release: plucked ? 0.12 : 0.16,
  });
}

// ---------- Track: retro (upbeat 8-bit loop, ~120 BPM) ----------

const RETRO_STEPS_PER_BAR = 8; // eighth notes
const RETRO_MELODY: (string | null)[][] = [
  // C
  ["E5", null, "G5", null, "C6", "B5", "A5", "G5"],
  // G
  ["D5", null, "G5", null, "B5", "A5", "G5", "B5"],
  // Am
  ["C6", null, "A5", null, "E5", "A5", "C6", "B5"],
  // F
  ["A5", null, "C6", null, "A5", "G5", "F5", null],
];
const RETRO_BASS: string[][] = [
  // quarter notes at steps 0, 2, 4, 6 (root / fifth)
  ["C3", "G2", "C3", "G2"],
  ["G2", "D3", "G2", "D3"],
  ["A2", "E3", "A2", "E3"],
  ["F2", "C3", "F2", "C3"],
];

function scheduleRetroStep(step: number, time: number): void {
  const inBar = step % RETRO_STEPS_PER_BAR;
  const bar = (step - inBar) / RETRO_STEPS_PER_BAR;

  const lead = RETRO_MELODY[bar]?.[inBar];
  if (lead) {
    playNote({
      freq: freqOf(lead),
      time,
      dur: 0.2,
      gain: 0.4,
      type: "square",
      decay: "sustain",
      release: 0.05,
    });
  }

  if (inBar % 2 === 0) {
    const bassNote = RETRO_BASS[bar]?.[inBar / 2];
    if (bassNote) {
      playNote({
        freq: freqOf(bassNote),
        time,
        dur: 0.2,
        gain: 0.38,
        type: "square",
        decay: "sustain",
        release: 0.06,
      });
    }
  }

  // noise hi-hats on every eighth; off-beats slightly louder
  const accent = inBar % 2 === 1;
  playNoise(time, accent ? 0.045 : 0.028, accent ? 0.11 : 0.055);
}

// ---------- Track: classical (baroque chamber, 4/4, ~76 BPM) ----------

const CLASSICAL_STEPS_PER_BAR = 8; // eighth notes
const CLASSICAL_STEP_S = 60 / 76 / 2;

interface ClassicalChordDef {
  bass: string;
  tones: string[]; // root, third, fifth, octave
}

// Pachelbel-style progression in D: D - A - Bm - F#m - G - D - G - A
const CLASSICAL_CHORDS: ClassicalChordDef[] = [
  { bass: "D3", tones: ["D4", "F#4", "A4", "D5"] }, // D
  { bass: "A2", tones: ["A3", "C#4", "E4", "A4"] }, // A
  { bass: "B2", tones: ["B3", "D4", "F#4", "B4"] }, // Bm
  { bass: "F#2", tones: ["F#3", "A3", "C#4", "F#4"] }, // F#m
  { bass: "G2", tones: ["G3", "B3", "D4", "G4"] }, // G
  { bass: "D3", tones: ["D4", "F#4", "A4", "D5"] }, // D
  { bass: "G2", tones: ["G3", "B3", "D4", "G4"] }, // G
  { bass: "A2", tones: ["A3", "C#4", "E4", "A4"] }, // A
];

// Broken-chord figure: up to the octave and back down.
const CLASSICAL_ARP_PATTERN = [0, 1, 2, 3, 2, 1, 0, 1];

function scheduleClassicalStep(step: number, time: number): void {
  const inBar = step % CLASSICAL_STEPS_PER_BAR;
  const chord = CLASSICAL_CHORDS[(step - inBar) / CLASSICAL_STEPS_PER_BAR];
  if (!chord) return;

  if (inBar === 0) {
    // soft string pad holding the triad through the whole bar
    const barSeconds = CLASSICAL_STEP_S * CLASSICAL_STEPS_PER_BAR;
    for (const note of chord.tones.slice(0, 3)) {
      playPadNote(freqOf(note), time, barSeconds * 0.98, 0.09);
    }
  }

  if (inBar % 2 === 0) {
    // pizzicato bass on the root, quarter notes
    playNote({
      freq: freqOf(chord.bass),
      time,
      dur: 0.34,
      gain: 0.36,
      type: "triangle",
    });
  }

  // harpsichord arpeggio on every eighth note (square, fast ~0.2s decay)
  playNote({
    freq: freqOf(chord.tones[CLASSICAL_ARP_PATTERN[inBar]]),
    time,
    dur: 0.2,
    gain: 0.16,
    type: "square",
  });
}

// ---------- Track: rock (chiptune rock, 4/4, ~112 BPM) ----------

const ROCK_STEPS_PER_BAR = 8; // eighth notes
const ROCK_STEP_S = 60 / 112 / 2;

interface RockLeadNote {
  at: number; // eighth-note offset inside the bar
  note: string;
  steps: number; // note length in eighth notes
}

// E minor pentatonic riff (E-G-A-B-D) with a couple of syncopated landings.
const ROCK_LEAD: RockLeadNote[][] = [
  // Em
  [
    { at: 0, note: "E5", steps: 2 },
    { at: 2, note: "G5", steps: 1 },
    { at: 3, note: "A5", steps: 2 },
    { at: 5, note: "B5", steps: 1 },
    { at: 6, note: "G5", steps: 2 },
  ],
  // C
  [
    { at: 0, note: "E5", steps: 1 },
    { at: 1, note: "D5", steps: 1 },
    { at: 2, note: "E5", steps: 2 },
    { at: 4, note: "G5", steps: 1 },
    { at: 5, note: "A5", steps: 2 },
  ],
  // G
  [
    { at: 0, note: "G5", steps: 2 },
    { at: 2, note: "A5", steps: 1 },
    { at: 3, note: "B5", steps: 2 },
    { at: 5, note: "D6", steps: 1 },
    { at: 6, note: "B5", steps: 1 },
    { at: 7, note: "A5", steps: 1 },
  ],
  // D
  [
    { at: 0, note: "A5", steps: 2 },
    { at: 2, note: "B5", steps: 1 },
    { at: 3, note: "A5", steps: 1 },
    { at: 4, note: "G5", steps: 2 },
    { at: 6, note: "E5", steps: 1 },
    { at: 7, note: "D5", steps: 1 },
  ],
];

const ROCK_BASS_ROOTS = ["E3", "C3", "G3", "D3"]; // Em - C - G - D
const ROCK_POWER_CHORDS: string[][] = [
  ["E4", "B4"], // Em (root + fifth)
  ["C4", "G4"], // C
  ["G4", "D5"], // G
  ["D4", "A4"], // D
];

let softClipCurve: Float32Array<ArrayBuffer> | null = null;

// Gentle tanh saturation for the power chords: the curve maps |x| > 1 to
// the ±1 endpoints, so the shaper never overshoots past full scale.
function getSoftClipCurve(): Float32Array<ArrayBuffer> {
  if (!softClipCurve) {
    const n = 1024;
    const drive = 2.4;
    const norm = Math.tanh(drive);
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(drive * x) / norm;
    }
    softClipCurve = curve;
  }
  return softClipCurve;
}

// Root + fifth power chord: two sawtooths per note detuned ±4 cents,
// through a lowpass and a soft waveshaper (light overdrive, no clipping).
function playPowerChord(notes: string[], time: number, dur: number): void {
  if (!ctx || !master) return;
  const pre = ctx.createGain();
  pre.gain.setValueAtTime(0.11, time);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, time);
  const shaper = ctx.createWaveShaper();
  shaper.curve = getSoftClipCurve();
  const g = ctx.createGain();
  const attack = 0.01;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.2, time + attack);
  g.gain.setValueAtTime(0.2, time + Math.max(attack, dur - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  pre.connect(lp);
  lp.connect(shaper);
  shaper.connect(g);
  g.connect(master);
  for (const note of notes) {
    const freq = freqOf(note);
    for (const cents of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(cents, time);
      osc.connect(pre);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    }
  }
}

// Kick: sine with a fast pitch drop (~130 Hz -> ~52 Hz) and a short decay.
function playKick(time: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, time);
  osc.frequency.exponentialRampToValueAtTime(52, time + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  osc.connect(g);
  g.connect(master);
  osc.start(time);
  osc.stop(time + 0.2);
}

// Snare: bandpassed noise around 1.5 kHz plus a short triangle body tone.
function playSnare(time: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1500, time);
  bp.Q.setValueAtTime(0.8, time);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.26, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(time);
  src.stop(time + 0.16);
  playNote({ freq: 180, time, dur: 0.09, gain: 0.12, type: "triangle" });
}

function scheduleRockStep(step: number, time: number): void {
  const inBar = step % ROCK_STEPS_PER_BAR;
  const bar = (step - inBar) / ROCK_STEPS_PER_BAR;

  // square lead riff
  const lead = ROCK_LEAD[bar];
  if (lead) {
    for (const hit of lead) {
      if (hit.at === inBar) {
        playNote({
          freq: freqOf(hit.note),
          time,
          dur: hit.steps * ROCK_STEP_S * 0.9,
          gain: 0.26,
          type: "square",
          decay: "sustain",
          release: 0.06,
        });
      }
    }
  }

  // driving square bass in eighths on the root
  const bassRoot = ROCK_BASS_ROOTS[bar];
  if (bassRoot) {
    playNote({
      freq: freqOf(bassRoot),
      time,
      dur: 0.16,
      gain: 0.26,
      type: "square",
      decay: "sustain",
      release: 0.05,
    });
  }

  // power chords on beats 1 and 3
  if (inBar === 0 || inBar === 4) {
    const chord = ROCK_POWER_CHORDS[bar];
    if (chord) playPowerChord(chord, time, ROCK_STEP_S * 3.2);
  }

  // drums: kick on 1 and 3 plus an off-beat pickup on the "and of 4",
  // snare on 2 and 4
  if (inBar === 0 || inBar === 4 || inBar === 7) playKick(time);
  if (inBar === 2 || inBar === 6) playSnare(time);
  // noise hats on every eighth, accented on the beat
  const onBeat = inBar % 2 === 0;
  playNoise(time, onBeat ? 0.04 : 0.025, onBeat ? 0.05 : 0.03);
}

// ---------- Track registry ----------

interface TrackDef {
  stepSeconds: number;
  totalSteps: number;
  scheduleStep: (step: number, time: number) => void;
}

const TRACKS: Record<MusicTrackId, TrackDef> = {
  vintage: {
    stepSeconds: 60 / 92 / 2,
    totalSteps: VINTAGE_CHORDS.length * VINTAGE_STEPS_PER_BAR,
    scheduleStep: scheduleVintageStep,
  },
  retro: {
    stepSeconds: 60 / 120 / 2,
    totalSteps: RETRO_MELODY.length * RETRO_STEPS_PER_BAR,
    scheduleStep: scheduleRetroStep,
  },
  classical: {
    stepSeconds: CLASSICAL_STEP_S,
    totalSteps: CLASSICAL_CHORDS.length * CLASSICAL_STEPS_PER_BAR,
    scheduleStep: scheduleClassicalStep,
  },
  rock: {
    stepSeconds: ROCK_STEP_S,
    totalSteps: ROCK_LEAD.length * ROCK_STEPS_PER_BAR,
    scheduleStep: scheduleRockStep,
  },
};

// ---------- Playback state ----------

let activeTrack: MusicTrackId | null = null;
let schedulerId: number | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let nextStepTime = 0;
let currentStep = 0;

function schedulerTick(): void {
  if (!ctx || !activeTrack || schedulerId === null) return;
  const def = TRACKS[activeTrack];
  // If the tab was throttled, resync instead of firing a burst of notes.
  if (nextStepTime < ctx.currentTime) {
    nextStepTime = ctx.currentTime + 0.05;
  }
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
    def.scheduleStep(currentStep, nextStepTime);
    nextStepTime += def.stepSeconds;
    currentStep = (currentStep + 1) % def.totalSteps;
  }
}

function fadeMaster(to: number, seconds: number): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const from = Math.max(master.gain.value, 0.0001);
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(from, now);
  master.gain.linearRampToValueAtTime(Math.max(to, 0.0001), now + seconds);
}

function clearPendingTimer(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function begin(track: MusicTrackId): void {
  const audio = getCtx();
  if (!audio || !master) return;
  clearPendingTimer();
  activeTrack = track;
  currentStep = 0;
  nextStepTime = audio.currentTime + 0.08;
  fadeMaster(MASTER_VOLUME, 0.5);
  if (schedulerId === null) {
    schedulerId = window.setInterval(schedulerTick, LOOKAHEAD_MS);
  }
  schedulerTick();
}

// ---------- Public API ----------

export function startMusic(track: MusicTrackId): void {
  if (typeof window === "undefined") return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  if (schedulerId === null) {
    begin(track);
    return;
  }
  if (activeTrack === track) {
    clearPendingTimer();
    fadeMaster(MASTER_VOLUME, 0.3);
    return;
  }
  // Crossfade into the new track.
  clearPendingTimer();
  fadeMaster(0.0001, SWITCH_FADE_S);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    begin(track);
  }, SWITCH_FADE_S * 1000 + 50);
}

export function stopMusic(): void {
  if (typeof window === "undefined") return;
  clearPendingTimer();
  if (!ctx || schedulerId === null) {
    activeTrack = null;
    return;
  }
  fadeMaster(0.0001, STOP_FADE_S);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (schedulerId !== null) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
    activeTrack = null;
  }, STOP_FADE_S * 1000 + 60);
}

export function setMusicTrack(track: MusicTrackId): void {
  if (typeof window === "undefined") return;
  // Only switches while music is running; enabling is handled by
  // applyMusicSettings so a disabled player stays silent.
  if (schedulerId !== null && activeTrack !== track) {
    startMusic(track);
  }
}

export function getActiveTrack(): MusicTrackId | null {
  return activeTrack;
}

export function isMusicActive(): boolean {
  return activeTrack !== null && schedulerId !== null;
}

export function applyMusicSettings(settings: {
  musicEnabled: boolean;
  musicTrack: MusicTrackId;
}): void {
  if (!settings.musicEnabled) {
    stopMusic();
    return;
  }
  startMusic(settings.musicTrack);
}

// ---------- Visibility + first gesture ----------

function handleVisibilityChange(): void {
  if (!ctx) return;
  if (document.hidden) {
    ctx.suspend().catch(() => {});
  } else if (activeTrack !== null) {
    ctx.resume().catch(() => {});
  }
}

let initialized = false;

export function initMusicOnFirstInteraction(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  const onFirstGesture = (): void => {
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("keydown", onFirstGesture, true);
    const settings = loadSettings();
    if (settings.musicEnabled) {
      applyMusicSettings({
        musicEnabled: true,
        musicTrack: settings.musicTrack,
      });
    }
  };
  window.addEventListener("pointerdown", onFirstGesture, {
    once: true,
    capture: true,
    passive: true,
  });
  window.addEventListener("keydown", onFirstGesture, {
    once: true,
    capture: true,
    passive: true,
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

// Auto-initialize as soon as this module reaches the browser: wait for the
// first user gesture to satisfy autoplay policies, then start if enabled.
if (typeof window !== "undefined") {
  initMusicOnFirstInteraction();
}
