// Runs the chess engine off the main thread so the UI never freezes while
// the machine is thinking. Everything is bundled locally (works offline).
import { findBestMove, resetTranspositionTable } from "./ai";
import type { Difficulty, GameState, Move } from "./types";

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: unknown) => void;
};

ctx.onmessage = (e: MessageEvent) => {
  const data = e.data as {
    id: number;
    state: GameState;
    difficulty: Difficulty;
  };
  // Keep memory bounded and avoid stale entries from a different game context.
  resetTranspositionTable();
  const move: Move | null = findBestMove(data.state, data.difficulty);
  ctx.postMessage({ id: data.id, move });
};
