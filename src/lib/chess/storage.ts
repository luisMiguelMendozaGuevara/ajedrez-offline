// LocalStorage-backed persistence for chess game state and statistics.

import { GameState, Difficulty } from "@/lib/chess/types";
import { HistoryEntry } from "@/hooks/useChessGame";
import { GameMode, PieceColor } from "@/lib/chess/types";
import type { MusicTrackId } from "./music";
import { OPENINGS } from "@/lib/chess/openings";
import { PRINCIPLES } from "@/lib/chess/principles";
import { RULES } from "@/lib/chess/rules";
import { TRAPS } from "@/lib/chess/traps";
import { ENDGAME_LESSONS } from "@/lib/chess/endgames";

const GAME_KEY = "chess:game:v1";
const STATS_KEY = "chess:stats:v1";
const SETTINGS_KEY = "chess:settings:v1";

// ---------- Game persistence ----------

export interface SavedGame {
  state: GameState;
  mode: GameMode;
  history: HistoryEntry[];
  capturedByWhite: import("@/lib/chess/types").PieceType[];
  capturedByBlack: import("@/lib/chess/types").PieceType[];
  flipped: boolean;
  savedAt: number;
}

export function saveGame(game: Omit<SavedGame, "savedAt">): void {
  try {
    const payload: SavedGame = { ...game, savedAt: Date.now() };
    localStorage.setItem(GAME_KEY, JSON.stringify(payload));
  } catch {
    // storage may be unavailable (private mode); ignore
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed?.state?.board || !parsed?.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

// ---------- Statistics ----------

export interface GameStats {
  wins: number; // wins as human vs AI
  losses: number; // losses vs AI
  draws: number;
  totalMoves: number;
  fastestWinMoves: number | null; // fewest moves to win
  bestStreak: number;
  currentStreak: number; // consecutive non-losses
  gamesPlayed: number;
  lastPlayed: number | null;
  // Wins as human vs AI, broken down by AI difficulty
  winsByDifficulty: Partial<Record<Difficulty, number>>;
}

const EMPTY_STATS: GameStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  totalMoves: 0,
  fastestWinMoves: null,
  bestStreak: 0,
  currentStreak: 0,
  gamesPlayed: 0,
  lastPlayed: null,
  winsByDifficulty: {},
};

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    const merged: GameStats = { ...EMPTY_STATS, ...parsed };
    // Sanitize legacy/corrupt data: ensure the per-difficulty map is an object
    if (
      !merged.winsByDifficulty ||
      typeof merged.winsByDifficulty !== "object"
    ) {
      merged.winsByDifficulty = {};
    }
    return merged;
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export type GameOutcome = "win" | "loss" | "draw";

export function recordGame(
  outcome: GameOutcome,
  movesPlayed: number,
  vsAI: boolean,
  difficulty?: Difficulty
): GameStats {
  const stats = loadStats();
  if (!vsAI) {
    // For human vs human, just count as a game played
    stats.gamesPlayed = (stats.gamesPlayed ?? 0) + 1;
    stats.totalMoves = (stats.totalMoves ?? 0) + movesPlayed;
    stats.lastPlayed = Date.now();
    saveStats(stats);
    return stats;
  }

  stats.gamesPlayed = (stats.gamesPlayed ?? 0) + 1;
  stats.totalMoves = (stats.totalMoves ?? 0) + movesPlayed;
  stats.lastPlayed = Date.now();

  if (outcome === "win") {
    stats.wins = (stats.wins ?? 0) + 1;
    if (difficulty) {
      stats.winsByDifficulty = {
        ...(stats.winsByDifficulty ?? {}),
        [difficulty]: (stats.winsByDifficulty?.[difficulty] ?? 0) + 1,
      };
    }
    stats.currentStreak = (stats.currentStreak ?? 0) + 1;
    if (stats.currentStreak > (stats.bestStreak ?? 0)) {
      stats.bestStreak = stats.currentStreak;
    }
    if (
      stats.fastestWinMoves == null ||
      movesPlayed < stats.fastestWinMoves
    ) {
      stats.fastestWinMoves = movesPlayed;
    }
  } else if (outcome === "loss") {
    stats.losses = (stats.losses ?? 0) + 1;
    stats.currentStreak = 0;
  } else {
    stats.draws = (stats.draws ?? 0) + 1;
    stats.currentStreak = (stats.currentStreak ?? 0) + 1;
  }

  saveStats(stats);
  return stats;
}

export function resetStats(): GameStats {
  const fresh = { ...EMPTY_STATS };
  saveStats(fresh);
  return fresh;
}

// ---------- Settings ----------

export type BoardThemeId = "classic" | "emerald" | "ocean" | "rose" | "midnight";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  light: string; // light square color
  dark: string; // dark square color
  border: string; // board frame gradient
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic: {
    id: "classic",
    name: "Pergamino",
    light: "#EFDAB9",
    dark: "#B08968",
    border: "linear-gradient(135deg, #4A342A, #33241C)",
  },
  emerald: {
    id: "emerald",
    name: "Verde club",
    light: "#E6E3CC",
    dark: "#5F7355",
    border: "linear-gradient(135deg, #2E3B2A, #1F2A1D)",
  },
  ocean: {
    id: "ocean",
    name: "Pizarra",
    light: "#E2E4E0",
    dark: "#64757E",
    border: "linear-gradient(135deg, #2B333A, #1B2227)",
  },
  rose: {
    id: "rose",
    name: "Caoba",
    light: "#EBD9C8",
    dark: "#9A6A56",
    border: "linear-gradient(135deg, #3E2A22, #2A1B15)",
  },
  midnight: {
    id: "midnight",
    name: "Ébano",
    light: "#CBC3B2",
    dark: "#4E463B",
    border: "linear-gradient(135deg, #2A241D, #171310)",
  },
};

export type PieceStyleId =
  | "staunton"
  | "engraved"
  | "walnut"
  | "silhouette"
  | "marble";

export interface PieceStyle {
  id: PieceStyleId;
  name: string;
  emoji: string;
}

export const PIECE_STYLES: PieceStyle[] = [
  { id: "staunton", name: "Natural", emoji: "♞" },
  { id: "engraved", name: "Grabado", emoji: "✎" },
  { id: "walnut", name: "Nogal", emoji: "🪵" },
  { id: "silhouette", name: "Silueta", emoji: "◑" },
  { id: "marble", name: "Mármol", emoji: "●" },
];

export type PieceSetId =
  | "merida"
  | "cburnett"
  | "chessnut"
  | "kiwen-suwi"
  | "celtic"
  | "fantasy"
  | "spatial"
  | "firi"
  | "rhosgfx"
  | "shapes"
  | "pixel"
  | "letter"
  | "pirouetti"
  | "mpchess"
  | "totoy"
  | "papercut"
  | "mono";

export interface PieceSet {
  id: PieceSetId;
  name: string;
  author: string;
  license: string;
}

export const PIECE_SETS_META: PieceSet[] = [
  {
    id: "merida",
    name: "Merida",
    author: "Armando H. Marroquín",
    license: "GPLv2+",
  },
  {
    id: "cburnett",
    name: "Staunton",
    author: "Colin M.L. Burnett",
    license: "CC BY-SA 3.0",
  },
  {
    id: "chessnut",
    name: "Chessnut",
    author: "Alexis Luengas",
    license: "Apache 2.0",
  },
  {
    id: "kiwen-suwi",
    name: "Kiwen Suwi",
    author: "neverRare",
    license: "CC BY 4.0",
  },
  {
    id: "celtic",
    name: "Celtic",
    author: "Maurizio Monge",
    license: "MIT",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    author: "Maurizio Monge",
    license: "MIT",
  },
  {
    id: "spatial",
    name: "Spatial",
    author: "Maurizio Monge",
    license: "MIT",
  },
  {
    id: "firi",
    name: "Firi",
    author: "James Faure",
    license: "CC BY 4.0",
  },
  {
    id: "rhosgfx",
    name: "RhosGFX",
    author: "RhosGFX",
    license: "CC0 1.0",
  },
  {
    id: "shapes",
    name: "Shapes",
    author: "flugsio",
    license: "CC BY-SA 4.0",
  },
  {
    id: "pixel",
    name: "Pixel",
    author: "therealqtpi",
    license: "AGPLv3+",
  },
  {
    id: "letter",
    name: "Letter",
    author: "usolando",
    license: "AGPLv3+",
  },
  {
    id: "pirouetti",
    name: "Pirouetti",
    author: "pirouetti",
    license: "AGPLv3+",
  },
  {
    id: "mpchess",
    name: "MPChess",
    author: "Maxime Chupin",
    license: "GPLv3+",
  },
  {
    id: "totoy",
    name: "Totoy",
    author: "Kosal Sen",
    license: "CC BY 4.0",
  },
  {
    id: "papercut",
    name: "Papercut",
    author: "Nikolay Anzarov",
    license: "CC BY 4.0",
  },
  {
    id: "mono",
    name: "Mono",
    author: "Thibault Duplessis & C.M.L. Burnett",
    license: "GPLv2+",
  },
];

export interface AppSettings {
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  pieceStyle: PieceStyleId;
  showCoordinates: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  highlightLastMove: boolean;
  musicEnabled: boolean;
  musicTrack: MusicTrackId;
}

const DEFAULT_SETTINGS: AppSettings = {
  boardTheme: "classic",
  pieceSet: "merida",
  pieceStyle: "staunton",
  showCoordinates: true,
  soundEnabled: true,
  hapticsEnabled: true,
  highlightLastMove: true,
  musicEnabled: true,
  musicTrack: "vintage",
};

const PIECE_STYLE_IDS = PIECE_STYLES.map((p) => p.id);
const PIECE_SET_IDS = PIECE_SETS_META.map((p) => p.id);
const MUSIC_TRACK_IDS: MusicTrackId[] = [
  "vintage",
  "retro",
  "classical",
  "rock",
];

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Sanitize persisted ids (piece styles were renamed in the vintage release).
    if (!BOARD_THEMES[merged.boardTheme]) {
      merged.boardTheme = DEFAULT_SETTINGS.boardTheme;
    }
    if (!PIECE_STYLE_IDS.includes(merged.pieceStyle)) {
      merged.pieceStyle = DEFAULT_SETTINGS.pieceStyle;
    }
    if (!PIECE_SET_IDS.includes(merged.pieceSet)) {
      merged.pieceSet = DEFAULT_SETTINGS.pieceSet;
    }
    if (!MUSIC_TRACK_IDS.includes(merged.musicTrack)) {
      merged.musicTrack = DEFAULT_SETTINGS.musicTrack;
    }
    if (typeof merged.musicEnabled !== "boolean") {
      merged.musicEnabled = DEFAULT_SETTINGS.musicEnabled;
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// helper to determine outcome from the human perspective in AI mode
export function humanOutcome(
  status: string,
  winner: PieceColor | null,
  humanColor: PieceColor
): GameOutcome | null {
  if (status === "checkmate") {
    return winner === humanColor ? "win" : "loss";
  }
  if (status === "stalemate" || status === "draw") return "draw";
  if (status === "resigned") {
    // resigning -> loss; if AI resigned -> win
    return winner === humanColor ? "win" : "loss";
  }
  return null;
}

// ---------- Learn progress ----------

export const LEARN_KEY = "chess:learn:v1";

export interface LearnProgress {
  viewedOpenings: Record<string, number>;
  understoodTraps: string[];
  completedEndgames: string[];
  readPrinciples: string[];
  readRules: string[];
}

function emptyLearnProgress(): LearnProgress {
  return {
    viewedOpenings: {},
    understoodTraps: [],
    completedEndgames: [],
    readPrinciples: [],
    readRules: [],
  };
}

function sanitizeIdList(value: unknown, known: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const clean = value.filter(
    (v): v is string => typeof v === "string" && known.has(v)
  );
  return Array.from(new Set(clean));
}

function sanitizeViewedOpenings(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const known = new Set(OPENINGS.map((o) => o.id));
  const clean: Record<string, number> = {};
  for (const [id, ts] of Object.entries(value as Record<string, unknown>)) {
    if (known.has(id) && typeof ts === "number" && Number.isFinite(ts)) {
      clean[id] = ts;
    }
  }
  return clean;
}

export function loadLearnProgress(): LearnProgress {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    if (!raw) return emptyLearnProgress();
    const parsed = JSON.parse(raw) as Partial<LearnProgress>;
    return {
      viewedOpenings: sanitizeViewedOpenings(parsed.viewedOpenings),
      understoodTraps: sanitizeIdList(
        parsed.understoodTraps,
        new Set(TRAPS.map((t) => t.id))
      ),
      completedEndgames: sanitizeIdList(
        parsed.completedEndgames,
        new Set(ENDGAME_LESSONS.map((l) => l.id))
      ),
      readPrinciples: sanitizeIdList(
        parsed.readPrinciples,
        new Set(PRINCIPLES.map((p) => p.id))
      ),
      readRules: sanitizeIdList(
        parsed.readRules,
        new Set(RULES.map((r) => r.id))
      ),
    };
  } catch {
    return emptyLearnProgress();
  }
}

export function saveLearnProgress(progress: LearnProgress): void {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function resetLearnProgress(): LearnProgress {
  const fresh = emptyLearnProgress();
  saveLearnProgress(fresh);
  return fresh;
}
