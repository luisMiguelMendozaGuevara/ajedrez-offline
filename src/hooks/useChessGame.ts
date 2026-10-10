"use client";

import { create } from "zustand";
import {
  applyMove,
  generateLegalMoves,
  getLegalMovesFrom,
  getStatus,
  initialState,
  isInCheck,
  findKing,
} from "@/lib/chess/engine";
import { findBestMove, resetTranspositionTable } from "@/lib/chess/ai";
import { toSan } from "@/lib/chess/notation";
import {
  GameState,
  GameStatus,
  GameMode,
  Move,
  PieceColor,
  PieceType,
  Square,
} from "@/lib/chess/types";
import {
  saveGame,
  clearSavedGame,
  loadGame,
  recordGame,
  humanOutcome,
} from "@/lib/chess/storage";
import { playSound, playHaptic } from "@/lib/chess/sound";
import { useSettings } from "./useSettings";
import {
  exportPgn as pgnExport,
  headersFromMode as pgnHeaders,
  importPgn as pgnImport,
} from "@/lib/chess/pgn";

export interface HistoryEntry {
  move: Move;
  san: string;
  stateBefore: GameState;
  capturedByWhite: PieceType[]; // pieces white has captured
  capturedByBlack: PieceType[];
}

interface ChessStore {
  state: GameState;
  mode: GameMode;
  history: HistoryEntry[];
  status: GameStatus;
  winner: PieceColor | null;
  selected: Square | null;
  legalForSelected: Move[];
  lastMove: { from: Square; to: Square } | null;
  thinking: boolean; // AI thinking
  promotionPending: { from: Square; to: Square } | null;
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  flipped: boolean; // board orientation
  hintMove: { from: Square; to: Square } | null;
  statsRecorded: boolean; // prevents double counting after game over
  // Chess clock
  whiteTime: number; // seconds remaining
  blackTime: number;
  lastTickAt: number | null; // timestamp of last clock update
  // PGN replay
  replayMode: boolean;
  // Review mode (repaso): step through a played game
  reviewMode: boolean; // currently reviewing a played game
  reviewPly: number; // number of plies shown (0 = initial position)
  reviewTotal: number; // total plies available to review

  // actions
  newGame: (mode: GameMode) => void;
  selectSquare: (sq: Square) => void;
  clearSelection: () => void;
  makeMove: (move: Move) => void;
  choosePromotion: (type: PieceType) => void;
  cancelPromotion: () => void;
  undo: () => void;
  resign: () => void;
  flipBoard: () => void;
  setMode: (mode: GameMode) => void;
  aiMove: () => void;
  showHint: () => void;
  clearHint: () => void;
  loadSaved: () => boolean;
  tickClock: () => void;
  exportPgn: () => string;
  loadPgn: (pgn: string) => boolean;
  // Review controls
  enterReview: () => void;
  exitReview: () => void;
  reviewStep: (delta: number) => void; // -1 back, +1 forward
  reviewTo: (ply: number) => void;
}

function computeStatus(state: GameState): {
  status: GameStatus;
  winner: PieceColor | null;
} {
  const res = getStatus(state);
  if (res.status === "checkmate") {
    return { status: "checkmate", winner: res.winner! };
  }
  if (res.status === "stalemate" || res.status === "draw") {
    return { status: res.status, winner: null };
  }
  if (res.status === "check") return { status: "check", winner: null };
  return { status: "playing", winner: null };
}

export const useChessGame = create<ChessStore>((set, get) => ({
  state: initialState(),
  mode: { type: "ai", difficulty: "medium", playerColor: "w" },
  history: [],
  status: "playing",
  winner: null,
  selected: null,
  legalForSelected: [],
  lastMove: null,
  thinking: false,
  promotionPending: null,
  capturedByWhite: [],
  capturedByBlack: [],
  flipped: false,
  hintMove: null,
  statsRecorded: false,
  whiteTime: 0,
  blackTime: 0,
  lastTickAt: null,
  replayMode: false,
  reviewMode: false,
  reviewPly: 0,
  reviewTotal: 0,

  newGame: (mode) => {
    const state = initialState();
    clearSavedGame();
    const initialTime = mode.timeControl?.initialSeconds ?? 0;
    set({
      state,
      mode,
      history: [],
      status: "playing",
      winner: null,
      selected: null,
      legalForSelected: [],
      lastMove: null,
      thinking: false,
      promotionPending: null,
      capturedByWhite: [],
      capturedByBlack: [],
      flipped: mode.type === "ai" && mode.playerColor === "b",
      hintMove: null,
      statsRecorded: false,
      whiteTime: initialTime,
      blackTime: initialTime,
      lastTickAt: initialTime > 0 ? Date.now() : null,
      replayMode: false,
      reviewMode: false,
      reviewPly: 0,
      reviewTotal: 0,
    });
    // If AI plays white, make first move
    if (mode.type === "ai" && mode.playerColor === "b") {
      setTimeout(() => get().aiMove(), 300);
    }
  },

  setMode: (mode) => {
    set({ mode, flipped: mode.type === "ai" && mode.playerColor === "b" });
  },

  flipBoard: () => set((s) => ({ flipped: !s.flipped })),

  loadSaved: () => {
    const saved = loadGame();
    if (!saved) return false;
    // Don't restore finished games
    if (
      saved.state.turn === undefined ||
      !Array.isArray(saved.state.board)
    )
      return false;
    // Quick status check to avoid restoring a finished game
    const { status } = computeStatus(saved.state);
    if (
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw"
    ) {
      clearSavedGame();
      return false;
    }
    set({
      state: saved.state,
      mode: saved.mode,
      history: saved.history,
      status,
      winner: null,
      selected: null,
      legalForSelected: [],
      lastMove:
        saved.history.length > 0
          ? {
              from: saved.history[saved.history.length - 1].move.from,
              to: saved.history[saved.history.length - 1].move.to,
            }
          : null,
      thinking: false,
      promotionPending: null,
      capturedByWhite: saved.capturedByWhite,
      capturedByBlack: saved.capturedByBlack,
      flipped: saved.flipped,
      hintMove: null,
      statsRecorded: false,
    });
    // If it's AI's turn, trigger it
    const { mode, state } = get();
    if (mode.type === "ai" && state.turn !== mode.playerColor) {
      setTimeout(() => get().aiMove(), 300);
    }
    return true;
  },

  selectSquare: (sq) => {
    const { state, selected, legalForSelected, mode } = get();
    const piece = state.board[sq.row][sq.col];
    const settings = useSettings.getState();

    // If a square is already selected, try to move
    if (selected) {
      // clicked same square -> deselect
      if (selected.row === sq.row && selected.col === sq.col) {
        set({ selected: null, legalForSelected: [] });
        return;
      }
      // clicked a legal target -> make move (handle promotion)
      const targetMoves = legalForSelected.filter(
        (m) => m.to.row === sq.row && m.to.col === sq.col
      );
      if (targetMoves.length > 0) {
        if (targetMoves.length > 1 && targetMoves[0].promotion) {
          // promotion: ask which piece
          set({
            promotionPending: { from: selected, to: sq },
            selected: null,
            legalForSelected: [],
            hintMove: null,
          });
          return;
        }
        get().makeMove(targetMoves[0]);
        return;
      }
      // clicked own piece -> reselect
      if (piece && piece.color === state.turn) {
        const legal = getLegalMovesFrom(state, sq);
        set({ selected: sq, legalForSelected: legal, hintMove: null });
        playSound("select", settings.soundEnabled);
        playHaptic(8, settings.hapticsEnabled);
        return;
      }
      // clicked elsewhere -> deselect
      set({ selected: null, legalForSelected: [] });
      return;
    }

    // No selection: select if it's the current player's piece
    if (piece && piece.color === state.turn) {
      // In AI mode, only allow selecting human's color
      if (mode.type === "ai" && piece.color !== mode.playerColor) return;
      const legal = getLegalMovesFrom(state, sq);
      if (legal.length > 0) {
        set({ selected: sq, legalForSelected: legal, hintMove: null });
        playSound("select", settings.soundEnabled);
        playHaptic(8, settings.hapticsEnabled);
      }
    }
  },

  clearSelection: () => set({ selected: null, legalForSelected: [] }),

  showHint: () => {
    const { state, mode, status, thinking, hintMove } = get();
    if (
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw" ||
      status === "resigned"
    )
      return;
    if (thinking) return;
    if (mode.type !== "ai") return;
    if (state.turn !== mode.playerColor) return;
    // Use the same engine (medium difficulty) to get a suggestion
    const best = findBestMove(state, "medium");
    if (best) {
      set({ hintMove: { from: best.from, to: best.to } });
      // auto-clear after a few seconds
      setTimeout(() => {
        if (get().hintMove) set({ hintMove: null });
      }, 4000);
    }
    void hintMove;
  },

  clearHint: () => set({ hintMove: null }),

  makeMove: (move) => {
    const {
      state,
      history,
      capturedByWhite,
      capturedByBlack,
      mode,
      whiteTime,
      blackTime,
      lastTickAt,
      replayMode,
    } = get();
    const san = toSan(state, move);
    const newState = applyMove(state, move);
    const settings = useSettings.getState();

    // Update clock: subtract elapsed time from mover, add increment
    let newWhiteTime = whiteTime;
    let newBlackTime = blackTime;
    let timeForfeit: PieceColor | null = null;
    if (mode.timeControl && mode.timeControl.initialSeconds > 0 && lastTickAt) {
      const elapsed = (Date.now() - lastTickAt) / 1000;
      const inc = mode.timeControl.increment;
      if (move.color === "w") {
        newWhiteTime = Math.max(0, whiteTime - elapsed + inc);
        if (newWhiteTime <= 0) timeForfeit = "w";
      } else {
        newBlackTime = Math.max(0, blackTime - elapsed + inc);
        if (newBlackTime <= 0) timeForfeit = "b";
      }
    }

    const newCapturedByWhite = [...capturedByWhite];
    const newCapturedByBlack = [...capturedByBlack];
    if (move.captured) {
      if (move.color === "w") newCapturedByWhite.push(move.captured);
      else newCapturedByBlack.push(move.captured);
    }

    const entry: HistoryEntry = {
      move,
      san,
      stateBefore: state,
      capturedByWhite: newCapturedByWhite,
      capturedByBlack: newCapturedByBlack,
    };

    let { status, winner } = computeStatus(newState);

    // Time forfeit overrides (only if game not already decided on board)
    if (
      timeForfeit &&
      status !== "checkmate" &&
      status !== "stalemate"
    ) {
      status = "checkmate"; // treat as a loss for the side that ran out
      winner = opposite(timeForfeit);
    }

    // Sound effects (skip in replay)
    if (!replayMode) {
      if (status === "checkmate") {
        playSound("gameEnd", settings.soundEnabled);
        playHaptic([30, 50, 30, 50, 80], settings.hapticsEnabled);
      } else if (status === "check") {
        playSound("check", settings.soundEnabled);
        playHaptic([20, 30, 20], settings.hapticsEnabled);
      } else if (move.isCastle) {
        playSound("castle", settings.soundEnabled);
        playHaptic(15, settings.hapticsEnabled);
      } else if (move.captured) {
        playSound("capture", settings.soundEnabled);
        playHaptic(20, settings.hapticsEnabled);
      } else {
        playSound("move", settings.soundEnabled);
        playHaptic(10, settings.hapticsEnabled);
      }
    }

    set({
      state: newState,
      history: [...history, entry],
      status,
      winner,
      selected: null,
      legalForSelected: [],
      lastMove: { from: move.from, to: move.to },
      capturedByWhite: newCapturedByWhite,
      capturedByBlack: newCapturedByBlack,
      promotionPending: null,
      hintMove: null,
      whiteTime: newWhiteTime,
      blackTime: newBlackTime,
      lastTickAt: Date.now(),
    });

    // Record stats on game end (once)
    const { statsRecorded } = get();
    const finished =
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw";
    if (finished && !statsRecorded && !replayMode) {
      const totalMoves = newState.fullmoveNumber;
      if (mode.type === "ai") {
        const outcome = humanOutcome(status, winner, mode.playerColor);
        if (outcome) recordGame(outcome, totalMoves, true);
      } else {
        recordGame("draw", totalMoves, false);
      }
      set({ statsRecorded: true, lastTickAt: null });
      clearSavedGame();
    } else if (!replayMode) {
      // Persist ongoing game
      saveGame({
        state: newState,
        mode,
        history: [...history, entry],
        capturedByWhite: newCapturedByWhite,
        capturedByBlack: newCapturedByBlack,
        flipped: get().flipped,
      });
    }

    // Trigger AI if it's AI's turn and game still going
    if (
      mode.type === "ai" &&
      status !== "checkmate" &&
      status !== "stalemate" &&
      status !== "draw" &&
      newState.turn !== mode.playerColor
    ) {
      setTimeout(() => get().aiMove(), 250);
    }
  },

  choosePromotion: (type) => {
    const { promotionPending, selected, legalForSelected } = get();
    if (!promotionPending) return;
    const move = legalForSelected.find(
      (m) =>
        m.from.row === promotionPending.from.row &&
        m.from.col === promotionPending.from.col &&
        m.to.row === promotionPending.to.row &&
        m.to.col === promotionPending.to.col &&
        m.promotion === type
    );
    // legalForSelected was cleared; recompute from current state
    const { state } = get();
    const legal = getLegalMovesFrom(state, promotionPending.from);
    const found = legal.find(
      (m) =>
        m.to.row === promotionPending.to.row &&
        m.to.col === promotionPending.to.col &&
        m.promotion === type
    );
    if (found) {
      get().makeMove(found);
    } else {
      set({ promotionPending: null });
    }
    void selected;
  },

  cancelPromotion: () => set({ promotionPending: null }),

  undo: () => {
    const { history, mode } = get();
    if (history.length === 0) return;
    // In AI mode, undo two plies (player + AI) so it's player's turn again
    const steps = mode.type === "ai" && history.length >= 2 ? 2 : 1;
    const newHistory = history.slice(0, history.length - steps);
    const lastEntry = newHistory[newHistory.length - 1];
    const newState = lastEntry ? lastEntry.stateBefore : initialState();
    let restoredState: GameState;
    let restoredCapturedW: PieceType[];
    let restoredCapturedB: PieceType[];
    let restoredLastMove: { from: Square; to: Square } | null;
    if (newHistory.length === 0) {
      restoredState = initialState();
      restoredCapturedW = [];
      restoredCapturedB = [];
      restoredLastMove = null;
    } else {
      let s = initialState();
      let capW: PieceType[] = [];
      let capB: PieceType[] = [];
      for (const entry of newHistory) {
        s = applyMove(s, entry.move);
        if (entry.move.captured) {
          if (entry.move.color === "w") capW.push(entry.move.captured);
          else capB.push(entry.move.captured);
        }
      }
      restoredState = s;
      restoredCapturedW = capW;
      restoredCapturedB = capB;
      const lastM = newHistory[newHistory.length - 1].move;
      restoredLastMove = { from: lastM.from, to: lastM.to };
    }
    const { status, winner } = computeStatus(restoredState);
    const settings = useSettings.getState();
    playSound("move", settings.soundEnabled);
    playHaptic(12, settings.hapticsEnabled);
    set({
      state: restoredState,
      history: newHistory,
      status,
      winner,
      selected: null,
      legalForSelected: [],
      lastMove: restoredLastMove,
      capturedByWhite: restoredCapturedW,
      capturedByBlack: restoredCapturedB,
      thinking: false,
      promotionPending: null,
      hintMove: null,
    });
    // Persist the undone state
    if (newHistory.length === 0) {
      clearSavedGame();
    } else {
      saveGame({
        state: restoredState,
        mode,
        history: newHistory,
        capturedByWhite: restoredCapturedW,
        capturedByBlack: restoredCapturedB,
        flipped: get().flipped,
      });
    }
    void newState;
    void lastEntry;
  },

  resign: () => {
    const { mode, state, statsRecorded } = get();
    const winner =
      mode.type === "ai"
        ? opposite(mode.playerColor)
        : opposite(state.turn);
    const settings = useSettings.getState();
    playSound("gameEnd", settings.soundEnabled);
    playHaptic([30, 50, 80], settings.hapticsEnabled);
    // Record a loss for the human (AI mode)
    if (mode.type === "ai" && !statsRecorded) {
      recordGame("loss", state.fullmoveNumber, true);
    }
    set({
      status: "resigned",
      winner,
      thinking: false,
      statsRecorded: true,
    });
    clearSavedGame();
  },

  aiMove: () => {
    const { state, mode, status } = get();
    if (
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw" ||
      status === "resigned"
    )
      return;
    if (mode.type !== "ai") return;
    if (state.turn === mode.playerColor) return;

    set({ thinking: true });
    // Defer to allow UI to update; AI runs synchronously but quick
    setTimeout(() => {
      // Reset transposition table before each move to keep memory bounded
      // and avoid stale entries from a different game context.
      resetTranspositionTable();
      const move = findBestMove(state, mode.difficulty ?? "medium");
      set({ thinking: false });
      if (move) {
        get().makeMove(move);
      }
    }, 50);
  },

  tickClock: () => {
    const { mode, status, state, whiteTime, blackTime, lastTickAt, replayMode } = get();
    if (replayMode) return;
    if (
      !mode.timeControl ||
      mode.timeControl.initialSeconds === 0 ||
      !lastTickAt
    )
      return;
    if (
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw" ||
      status === "resigned"
    )
      return;

    const elapsed = (Date.now() - lastTickAt) / 1000;
    if (state.turn === "w") {
      const newWhite = Math.max(0, whiteTime - elapsed);
      if (newWhite <= 0) {
        // Time forfeit for white
        set({
          whiteTime: 0,
          status: "checkmate",
          winner: "b",
          lastTickAt: null,
        });
        const { mode, statsRecorded } = get();
        if (!statsRecorded && mode.type === "ai") {
          recordGame(
            humanOutcome("checkmate", "b", mode.playerColor) ?? "loss",
            state.fullmoveNumber,
            true
          );
          set({ statsRecorded: true });
        }
        clearSavedGame();
        return;
      }
      set({ whiteTime: newWhite, lastTickAt: Date.now() });
    } else {
      const newBlack = Math.max(0, blackTime - elapsed);
      if (newBlack <= 0) {
        set({
          blackTime: 0,
          status: "checkmate",
          winner: "w",
          lastTickAt: null,
        });
        const { mode, statsRecorded } = get();
        if (!statsRecorded && mode.type === "ai") {
          recordGame(
            humanOutcome("checkmate", "w", mode.playerColor) ?? "loss",
            state.fullmoveNumber,
            true
          );
          set({ statsRecorded: true });
        }
        clearSavedGame();
        return;
      }
      set({ blackTime: newBlack, lastTickAt: Date.now() });
    }
  },

  exportPgn: () => {
    const { history, mode, status, winner } = get();
    const headers = pgnHeaders(mode, winner, status);
    return pgnExport(
      history.map((h) => ({ stateBefore: h.stateBefore, move: h.move })),
      headers
    );
  },

  loadPgn: (pgn) => {
    const imported = pgnImport(pgn);
    if (!imported || imported.moves.length === 0) return false;
    // Build history entries from imported moves
    const history: HistoryEntry[] = [];
    let capW: PieceType[] = [];
    let capB: PieceType[] = [];
    let lastState = initialState();
    let lastMove: { from: Square; to: Square } | null = null;
    for (const { stateBefore, move } of imported.moves) {
      const san = toSan(stateBefore, move);
      if (move.captured) {
        if (move.color === "w") capW.push(move.captured);
        else capB.push(move.captured);
      }
      history.push({
        move,
        san,
        stateBefore,
        capturedByWhite: [...capW],
        capturedByBlack: [...capB],
      });
      lastState = applyMove(stateBefore, move);
      lastMove = { from: move.from, to: move.to };
    }
    // Set to final state; disable AI; mark as replay (no stats, no persistence)
    set({
      state: lastState,
      mode: { type: "human", playerColor: "w" },
      history,
      status: "playing",
      winner: null,
      selected: null,
      legalForSelected: [],
      lastMove,
      thinking: false,
      promotionPending: null,
      capturedByWhite: capW,
      capturedByBlack: capB,
      flipped: false,
      hintMove: null,
      statsRecorded: true,
      replayMode: true,
      whiteTime: 0,
      blackTime: 0,
      lastTickAt: null,
    });
    return true;
  },

  enterReview: () => {
    const { history } = get();
    if (history.length === 0) return;
    set({
      reviewMode: true,
      reviewPly: history.length,
      reviewTotal: history.length,
    });
  },

  exitReview: () => {
    const { history } = get();
    // restore to the live (final) state and last move
    let liveState = initialState();
    for (const entry of history) {
      liveState = applyMove(liveState, entry.move);
    }
    const lastM = history.length > 0 ? history[history.length - 1].move : null;
    set({
      reviewMode: false,
      state: liveState,
      lastMove: lastM ? { from: lastM.from, to: lastM.to } : null,
    });
  },

  reviewStep: (delta) => {
    const { reviewPly, reviewTotal, history } = get();
    const newPly = Math.max(0, Math.min(reviewTotal, reviewPly + delta));
    if (newPly === reviewPly) return;
    // Rebuild state up to newPly
    let s = initialState();
    let capW: PieceType[] = [];
    let capB: PieceType[] = [];
    for (let i = 0; i < newPly; i++) {
      const entry = history[i];
      s = applyMove(s, entry.move);
      if (entry.move.captured) {
        if (entry.move.color === "w") capW.push(entry.move.captured);
        else capB.push(entry.move.captured);
      }
    }
    const lastM = newPly > 0 ? history[newPly - 1].move : null;
    set({
      reviewPly: newPly,
      state: s,
      lastMove: lastM ? { from: lastM.from, to: lastM.to } : null,
      selected: null,
      legalForSelected: [],
      hintMove: null,
      capturedByWhite: capW,
      capturedByBlack: capB,
    });
  },

  reviewTo: (ply) => {
    const { reviewTotal } = get();
    const clamped = Math.max(0, Math.min(reviewTotal, ply));
    const { reviewPly } = get();
    get().reviewStep(clamped - reviewPly);
  },
}));

function opposite(c: PieceColor): PieceColor {
  return c === "w" ? "b" : "w";
}

// Selector helpers
export function isKingInCheckSquare(state: GameState, color: PieceColor): Square | null {
  if (!isInCheck(state.board, color)) return null;
  return findKing(state.board, color);
}
