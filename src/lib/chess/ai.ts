import {
  applyMove,
  generateLegalMoves,
  isInCheck,
} from "./engine";
import { GameState, Move, PieceColor, PieceType, Difficulty, PIECE_VALUES } from "./types";

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

// ---------- Zobrist hashing + transposition table ----------
// Speeds up the search for expert level by caching evaluated positions.

const ZOBRIST_PIECES = 12; // 6 piece types x 2 colors
const ZOBRIST_CASTLE = 4; // 4 castling rights
const ZOBRIST_EP = 8; // 8 files for en passant
const ZOBRIST_TURN = 2; // white/black to move

// Pre-computed random 32-bit values
let zobristTable: {
  pieces: number[][][]; // [row][col][pieceIndex]
  castle: number[]; // [4]
  ep: number[]; // [8]
  turn: number[]; // [2]
} | null = null;

function getZobrist() {
  if (zobristTable) return zobristTable;
  const pieces: number[][][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => Array(ZOBRIST_PIECES).fill(0))
  );
  const castle = Array(ZOBRIST_CASTLE).fill(0);
  const ep = Array(ZOBRIST_EP).fill(0);
  const turn = Array(ZOBRIST_TURN).fill(0);
  // Simple PRNG (mulberry32) seeded deterministically
  let seed = 0x1234abcd;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      for (let i = 0; i < ZOBRIST_PIECES; i++) pieces[r][c][i] = rand();
  for (let i = 0; i < ZOBRIST_CASTLE; i++) castle[i] = rand();
  for (let i = 0; i < ZOBRIST_EP; i++) ep[i] = rand();
  for (let i = 0; i < ZOBRIST_TURN; i++) turn[i] = rand();
  zobristTable = { pieces, castle, ep, turn };
  return zobristTable;
}

function pieceIndex(type: PieceType, color: PieceColor): number {
  const base = type === "p" ? 0 : type === "n" ? 1 : type === "b" ? 2 : type === "r" ? 3 : type === "q" ? 4 : 5;
  return base * 2 + (color === "w" ? 0 : 1);
}

function computeZobrist(state: GameState): number {
  const z = getZobrist();
  let h = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p) h ^= z.pieces[r][c][pieceIndex(p.type, p.color)];
    }
  }
  if (state.castling.wK) h ^= z.castle[0];
  if (state.castling.wQ) h ^= z.castle[1];
  if (state.castling.bK) h ^= z.castle[2];
  if (state.castling.bQ) h ^= z.castle[3];
  if (state.enPassant) h ^= z.ep[state.enPassant.col];
  h ^= z.turn[state.turn === "w" ? 0 : 1];
  return h >>> 0;
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 0 | 1 | 2; // exact, lower bound, upper bound
}

const transpositionTable = new Map<number, TTEntry>();
const TT_MAX = 50000;

function ttGet(hash: number): TTEntry | undefined {
  return transpositionTable.get(hash);
}

function ttSet(hash: number, entry: TTEntry): void {
  if (transpositionTable.size >= TT_MAX) {
    // Evict oldest ~25% to avoid unbounded growth
    const keys = transpositionTable.keys();
    let toRemove = Math.floor(TT_MAX * 0.25);
    for (const k of keys) {
      transpositionTable.delete(k);
      toRemove--;
      if (toRemove <= 0) break;
    }
  }
  transpositionTable.set(hash, entry);
}

// Reset the transposition table (call between moves to free memory)
export function resetTranspositionTable(): void {
  transpositionTable.clear();
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

  // Transposition table lookup
  const hash = computeZobrist(state);
  const cached = ttGet(hash);
  const ALPHA = -1000000;
  if (cached && cached.depth >= depth) {
    if (cached.flag === 0) return cached.score; // exact
    if (cached.flag === 1 && cached.score >= beta) return cached.score; // lower bound
    if (cached.flag === 2 && cached.score <= alpha) return cached.score; // upper bound
  }
  void ALPHA;

  const ordered = orderMoves(moves);
  let best = -Infinity;
  const origAlpha = alpha;
  for (const move of ordered) {
    const ns = applyMove(state, move);
    const score = -negamax(ns, depth - 1, -beta, -alpha, color === "w" ? "b" : "w");
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  // Store in transposition table
  let flag: 0 | 1 | 2 = 0;
  if (best <= origAlpha) flag = 2; // upper bound
  else if (best >= beta) flag = 1; // lower bound
  ttSet(hash, { depth, score: best, flag });

  return best;
}

export function findBestMove(
  state: GameState,
  difficulty: Difficulty
): Move | null {
  const moves = generateLegalMoves(state);
  if (moves.length === 0) return null;

  const aiColor = state.turn;

  if (difficulty === "beginner") {
    // Fully random legal moves — for absolute beginners
    // Bias slightly against hanging the queen/king-adjacent moves
    const safe = moves.filter((m) => {
      // avoid moving into immediate capture by a pawn (very rough)
      return true;
    });
    const pool = safe.length > 0 ? safe : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (difficulty === "easy") {
    // Easy: pick from top half by static eval, with randomness
    const scored = moves.map((m) => {
      const ns = applyMove(state, m);
      return { move: m, score: evaluate(ns, aiColor) + (Math.random() - 0.5) * 120 };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  const depthMap: Record<string, number> = {
    medium: 2,
    hard: 3,
    expert: 4,
  };
  const depth = depthMap[difficulty] ?? 2;
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
