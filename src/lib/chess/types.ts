// Chess type definitions

export type PieceColor = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

// Board is indexed [row][col]; row 0 = rank 8 (top), row 7 = rank 1 (bottom)
// col 0 = file a, col 7 = file h
export type Board = (Piece | null)[][];

export interface Square {
  row: number;
  col: number;
}

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  promotion?: PieceType;
  isCastle?: "k" | "q"; // king-side / queen-side
  isEnPassant?: boolean;
  // SAN-like metadata filled after generation
  san?: string;
}

export interface CastlingRights {
  wK: boolean; // white king-side
  wQ: boolean; // white queen-side
  bK: boolean;
  bQ: boolean;
}

export interface GameState {
  board: Board;
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: Square | null; // target square for en passant capture
  halfmoveClock: number;
  fullmoveNumber: number;
}

export type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "resigned";

export interface GameMode {
  type: "ai" | "human";
  difficulty?: Difficulty;
  playerColor: PieceColor; // color the human plays (for ai mode)
  timeControl?: TimeControl; // optional chess clock
}

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

export interface TimeControl {
  initialSeconds: number; // per side
  increment: number; // increment per move (seconds, Fischer)
}

// Preset time controls (in seconds)
export const TIME_PRESETS: { id: string; label: string; seconds: number; increment: number; emoji: string }[] = [
  { id: "none", label: "Sin tiempo", seconds: 0, increment: 0, emoji: "∞" },
  { id: "bullet", label: "Bala", seconds: 60, increment: 0, emoji: "⚡" },
  { id: "blitz", label: "Relámpago", seconds: 180, increment: 2, emoji: "🔥" },
  { id: "rapid", label: "Rápida", seconds: 600, increment: 5, emoji: "⏱" },
  { id: "classic", label: "Clásica", seconds: 1800, increment: 0, emoji: "♟" },
];

export const DIFFICULTY_META: { id: Difficulty; label: string; description: string; emoji: string }[] = [
  { id: "beginner", label: "Principiante", description: "Movimientos aleatorios", emoji: "🌱" },
  { id: "easy", label: "Fácil", description: "Profundidad 1 + aleatorio", emoji: "✨" },
  { id: "medium", label: "Medio", description: "Profundidad 2", emoji: "🧠" },
  { id: "hard", label: "Difícil", description: "Profundidad 3", emoji: "⚔️" },
  { id: "expert", label: "Experto", description: "Profundidad 4", emoji: "👑" },
];

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const PIECE_NAMES: Record<PieceType, string> = {
  p: "Peón",
  n: "Caballo",
  b: "Alfil",
  r: "Torre",
  q: "Dama",
  k: "Rey",
};

// Unicode chess symbols
export const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};
