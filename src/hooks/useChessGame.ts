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

  newGame: (mode) => {
    const state = initialState();
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

  selectSquare: (sq) => {
    const { state, selected, legalForSelected, mode } = get();
    const piece = state.board[sq.row][sq.col];

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
          });
          return;
        }
        get().makeMove(targetMoves[0]);
        return;
      }
      // clicked own piece -> reselect
      if (piece && piece.color === state.turn) {
        const legal = getLegalMovesFrom(state, sq);
        set({ selected: sq, legalForSelected: legal });
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
      set({ selected: sq, legalForSelected: legal });
    }
  },

  clearSelection: () => set({ selected: null, legalForSelected: [] }),

  makeMove: (move) => {
    const { state, history, capturedByWhite, capturedByBlack } = get();
    const san = toSan(state, move);
    const newState = applyMove(state, move);

    const newCapturedByWhite = [...capturedByWhite];
    const newCapturedByBlack = [...capturedByBlack];
    if (move.captured) {
      // captured piece belonged to the opponent of move.color
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
    });

    // Trigger AI if it's AI's turn and game still going
    const { mode } = get();
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
    // We need to replay from start to get the state BEFORE last move... 
    // Actually stateBefore is the state before that move was made.
    // If newHistory empty -> initial state
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
      // state before the last move of newHistory is what we want? No.
      // We want the state AFTER applying all moves in newHistory.
      // Rebuild by applying moves from initial state.
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
    });
    void newState;
    void lastEntry;
  },

  resign: () => {
    const { mode, state } = get();
    const winner = mode.type === "ai" ? opposite(mode.playerColor) : opposite(state.turn);
    set({ status: "resigned", winner, thinking: false });
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
