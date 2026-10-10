// LocalStorage-backed persistence for chess game state and statistics.

import { GameState } from "@/lib/chess/types";
import { HistoryEntry } from "@/hooks/useChessGame";
import { GameMode, PieceColor } from "@/lib/chess/types";

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
};

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return { ...EMPTY_STATS, ...parsed };
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
  vsAI: boolean
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
    name: "Clásico",
    light: "#ebd2a8",
    dark: "#a87b54",
    border: "linear-gradient(135deg, #3a2a1a, #2a1d10)",
  },
  emerald: {
    id: "emerald",
    name: "Esmeralda",
    light: "#e8f0e3",
    dark: "#5a8a5e",
    border: "linear-gradient(135deg, #1f3a2a, #142019)",
  },
  ocean: {
    id: "ocean",
    name: "Océano",
    light: "#e0eaf2",
    dark: "#4a7a9a",
    border: "linear-gradient(135deg, #1a2a3a, #101824)",
  },
  rose: {
    id: "rose",
    name: "Rosado",
    light: "#f5e6ea",
    dark: "#a85a6e",
    border: "linear-gradient(135deg, #3a1a24, #241018)",
  },
  midnight: {
    id: "midnight",
    name: "Medianoche",
    light: "#c9cdd6",
    dark: "#4a5263",
    border: "linear-gradient(135deg, #1a1d2a, #0e1018)",
  },
};

export type PieceStyleId = "classic" | "outline" | "neon" | "wood" | "minimal";

export interface PieceStyle {
  id: PieceStyleId;
  name: string;
  emoji: string;
}

export const PIECE_STYLES: PieceStyle[] = [
  { id: "classic", name: "Clásico", emoji: "♟" },
  { id: "outline", name: "Contorno", emoji: "♔" },
  { id: "neon", name: "Neón", emoji: "✦" },
  { id: "wood", name: "Madera", emoji: "🪵" },
  { id: "minimal", name: "Minimal", emoji: "●" },
];

export interface AppSettings {
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  showCoordinates: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  highlightLastMove: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  boardTheme: "classic",
  pieceStyle: "classic",
  showCoordinates: true,
  soundEnabled: true,
  hapticsEnabled: true,
  highlightLastMove: true,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
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
