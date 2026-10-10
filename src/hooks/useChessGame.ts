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
import { findBestMove } from "@/lib/chess/ai";
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

  newGame: (mode) => {
    const state = initialState();
    clearSavedGame();
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
    const { state, history, capturedByWhite, capturedByBlack } = get();
    const san = toSan(state, move);
    const newState = applyMove(state, move);
    const settings = useSettings.getState();

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

    const { status, winner } = computeStatus(newState);

    // Sound effects
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
    });

    // Record stats on game end (once)
    const { mode, statsRecorded } = get();
    const finished =
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw";
    if (finished && !statsRecorded) {
      const totalMoves = newState.fullmoveNumber;
      if (mode.type === "ai") {
        const outcome = humanOutcome(status, winner, mode.playerColor);
        if (outcome) recordGame(outcome, totalMoves, true);
      } else {
        recordGame("draw", totalMoves, false);
      }
      set({ statsRecorded: true });
      clearSavedGame();
    } else {
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
      const move = findBestMove(state, mode.difficulty ?? "medium");
      set({ thinking: false });
      if (move) {
        get().makeMove(move);
      }
    }, 50);
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
