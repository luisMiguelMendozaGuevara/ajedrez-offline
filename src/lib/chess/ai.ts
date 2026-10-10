import {
  applyMove,
  generateLegalMoves,
  isInCheck,
} from "./engine";
import { GameState, Move, PieceColor, PieceType, PIECE_VALUES } from "./types";

// Piece-square tables (from white's perspective; row 0 = rank 8).
// We'll flip for black.
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST_MID = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_PST_END = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

const PST: Record<PieceType, number[][]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST_MID,
};

function getPstValue(type: PieceType, color: PieceColor, row: number, col: number, endgame: boolean): number {
  if (type === "k" && endgame) {
    // For black king, flip the table vertically
    return color === "w"
      ? KING_PST_END[row][col]
      : KING_PST_END[7 - row][col];
  }
  const table = PST[type];
  return color === "w" ? table[row][col] : table[7 - row][col];
}

function isEndgamePhase(board: GameState["board"]): boolean {
  let queens = 0;
  let minors = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === "q") queens++;
      if (p.type === "n" || p.type === "b" || p.type === "r") minors++;
    }
  }
  return queens === 0 || (queens <= 2 && minors <= 4);
}

// Evaluate from the perspective of `color` (positive = good for color)
export function evaluate(state: GameState, color: PieceColor): number {
  let score = 0;
  const endgame = isEndgamePhase(state.board);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const value = PIECE_VALUES[p.type] + getPstValue(p.type, p.color, r, c, endgame);
      score += p.color === color ? value : -value;
    }
  }
  // Small bonus for checks (tactical pressure)
  const opponent = color === "w" ? "b" : "w";
  if (isInCheck(state.board, opponent)) score += 30;
  return score;
}

// Order moves to improve alpha-beta pruning (captures first, especially high-value)
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
}

function scoreMove(m: Move): number {
  let s = 0;
  if (m.captured) {
    s += 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece];
  }
  if (m.promotion) s += PIECE_VALUES[m.promotion];
  if (m.isCastle) s += 50;
  return s;
}

interface SearchOptions {
  depth: number;
  // For easy mode, add randomness
  randomFactor?: number;
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  color: PieceColor
): number {
  const moves = generateLegalMoves(state);

  if (moves.length === 0) {
    if (isInCheck(state.board, state.turn)) {
      // checkmate: bad for side to move
      return -100000 - depth;
    }
    return 0; // stalemate
  }

  if (depth === 0) {
    return evaluate(state, color);
  }

  const ordered = orderMoves(moves);
  let best = -Infinity;
  for (const move of ordered) {
    const ns = applyMove(state, move);
    const score = -negamax(ns, depth - 1, -beta, -alpha, color === "w" ? "b" : "w");
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function findBestMove(
  state: GameState,
  difficulty: "easy" | "medium" | "hard"
): Move | null {
  const moves = generateLegalMoves(state);
  if (moves.length === 0) return null;

  const aiColor = state.turn;

  if (difficulty === "easy") {
    // Easy: 70% best move at depth 1 with randomness, 30% random
    const scored = moves.map((m) => {
      const ns = applyMove(state, m);
      return { move: m, score: evaluate(ns, aiColor) + (Math.random() - 0.5) * 120 };
    });
    scored.sort((a, b) => b.score - a.score);
    // pick from top half randomly to be weak but not totally random
    const top = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  const depth = difficulty === "medium" ? 2 : 3;
  const ordered = orderMoves(moves);

  let bestMove = ordered[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of ordered) {
    const ns = applyMove(state, move);
    const score = -negamax(ns, depth - 1, -beta, -alpha, aiColor === "w" ? "b" : "w");
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (bestScore > alpha) alpha = bestScore;
  }

  return bestMove;
}
