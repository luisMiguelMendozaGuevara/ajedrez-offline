// Chess puzzles: verified mate positions. Each puzzle is built either by
// replaying SAN moves from the initial position (opening miniatures/traps)
// or from a FEN-like piece placement (endgame techniques), then the whole
// solution is replayed against the engine and must end in checkmate
// (VALID_PUZZLES enforces this at module load).

import { applyMove, generateLegalMoves, getStatus, initialState } from "./engine";
import { toSan } from "./notation";
import { GameState, Move, PieceColor } from "./types";
import { EXTRA_PUZZLES } from "./puzzlesExtra";

export type PuzzleTheme =
  | "mate-pastor"
  | "mate-loco"
  | "asfixia"
  | "trampa"
  | "ultima-fila"
  | "sacrificio"
  | "final";

export type PuzzleLevel = "principiante" | "intermedio" | "avanzado";

export const PUZZLE_LEVELS: { id: PuzzleLevel; label: string }[] = [
  { id: "principiante", label: "Principiante" },
  { id: "intermedio", label: "Intermedio" },
  { id: "avanzado", label: "Avanzado" },
];

export const PUZZLE_THEMES: {
  id: PuzzleTheme;
  label: string;
  emoji: string;
}[] = [
  { id: "mate-pastor", label: "Mate del pastor", emoji: "🎩" },
  { id: "mate-loco", label: "Mate del loco", emoji: "🃏" },
  { id: "asfixia", label: "Asfixia", emoji: "🕸️" },
  { id: "trampa", label: "Trampa", emoji: "🎣" },
  { id: "ultima-fila", label: "Última fila", emoji: "🏰" },
  { id: "sacrificio", label: "Sacrificio", emoji: "⚔️" },
  { id: "final", label: "Final", emoji: "♔" },
];

export interface Puzzle {
  id: string;
  title: string;
  difficulty: "M1" | "M2" | "M3"; // mate in 1 / 2 / 3
  theme: PuzzleTheme;
  level: PuzzleLevel;
  // Sequence of moves (SAN) from the initial position to set up the puzzle.
  // Alternative: a FEN-like placement (row 0 = rank 8, uppercase = white).
  setupMoves?: string[];
  placement?: string;
  sideToMove: PieceColor;
  // Solution line: alternating moves. Index 0,2,4... are the side-to-move's
  // moves (what the player must play). Index 1,3,5... are the opponent's
  // forced replies (auto-played by the engine).
  solution: string[]; // e.g. ["Qxf7#"] or ["Qh7+", "Kf8", "Qh8#"]
  hint: string;
}

// Get only the player's moves (even indices) from a solution
export function getPlayerMoves(solution: string[]): string[] {
  return solution.filter((_, i) => i % 2 === 0);
}

// Get only the opponent's replies (odd indices) from a solution
export function getOpponentReplies(solution: string[]): string[] {
  return solution.filter((_, i) => i % 2 === 1);
}

// Build a GameState by replaying SAN moves from the initial position.
export function buildStateFromSans(sans: string[]): {
  state: GameState;
  ok: boolean;
} {
  let state = initialState();
  for (const sanRaw of sans) {
    const san = sanRaw.replace(/[+#]$/, "");
    const legal = generateLegalMoves(state);
    const move = matchSan(state, san, legal);
    if (!move) return { state, ok: false };
    state = applyMove(state, move);
  }
  return { state, ok: true };
}

// Build a GameState from a FEN-like placement ("7k/8/5K2/6Q1/8/8/8/8").
export function buildFromPlacement(
  placement: string,
  turn: PieceColor
): { state: GameState; ok: boolean } {
  const rows = placement.split("/");
  if (rows.length !== 8) {
    return { state: initialState(), ok: false };
  }
  const board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null)
  ) as GameState["board"];
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        c += parseInt(ch, 10);
        continue;
      }
      const type = ch.toLowerCase();
      if (!/[kqrbnp]/.test(type) || c > 7) {
        return { state: initialState(), ok: false };
      }
      board[r][c] = {
        type: type as "k" | "q" | "r" | "b" | "n" | "p",
        color: ch === ch.toUpperCase() ? "w" : "b",
      };
      c++;
    }
    if (c !== 8) return { state: initialState(), ok: false };
  }
  return {
    state: {
      board,
      turn,
      castling: { wK: false, wQ: false, bK: false, bQ: false },
      enPassant: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
    },
    ok: true,
  };
}

// Build the starting position of any puzzle (placement or move sequence).
export function buildPuzzleState(puzzle: Puzzle): {
  state: GameState;
  ok: boolean;
} {
  if (puzzle.placement) {
    const built = buildFromPlacement(puzzle.placement, puzzle.sideToMove);
    if (!built.ok) return built;
    return { state: built.state, ok: built.state.turn === puzzle.sideToMove };
  }
  const built = buildStateFromSans(puzzle.setupMoves ?? []);
  if (!built.ok) return built;
  return { state: built.state, ok: built.state.turn === puzzle.sideToMove };
}

export function matchSan(state: GameState, sanRaw: string, legal: Move[]): Move | null {
  const san = sanRaw.replace(/[+#]$/, "").replace(/e\.p\.?$/i, "");
  if (san === "O-O" || san === "0-0")
    return legal.find((m) => m.isCastle === "k") ?? null;
  if (san === "O-O-O" || san === "0-0-0")
    return legal.find((m) => m.isCastle === "q") ?? null;

  let promotion: string | null = null;
  let core = san;
  const promoMatch = core.match(/=([QRBN])$/i);
  if (promoMatch) {
    promotion = promoMatch[1].toLowerCase();
    core = core.slice(0, -2);
  }

  let piece = "p";
  if (/^[KNBQR]/.test(core)) {
    piece = core[0].toLowerCase();
    core = core.slice(1);
  }

  const capture = core.includes("x");
  core = core.replace("x", "");
  if (core.length < 2) return null;
  const toAlg = core.slice(-2);
  const toCol = toAlg.charCodeAt(0) - "a".charCodeAt(0);
  const toRow = 8 - parseInt(toAlg[1], 10);
  if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return null;

  const disamb = core.slice(0, -2);
  let fromCol: number | null = null;
  let fromRow: number | null = null;
  for (const ch of disamb) {
    if (/[a-h]/.test(ch)) fromCol = ch.charCodeAt(0) - "a".charCodeAt(0);
    else if (/[1-8]/.test(ch)) fromRow = 8 - parseInt(ch, 10);
  }

  return (
    legal.find((m) => {
      if (m.piece !== piece) return false;
      if (m.to.row !== toRow || m.to.col !== toCol) return false;
      if (fromCol !== null && m.from.col !== fromCol) return false;
      if (fromRow !== null && m.from.row !== fromRow) return false;
      if (promotion) {
        if (m.promotion !== promotion) return false;
      } else {
        if (m.promotion) return false;
      }
      return true;
    }) ?? null
  );
}

// Curated pool: every entry was validated against the engine (setup legal,
// side to move correct, full solution ends in checkmate).
export const PUZZLES: Puzzle[] = [
  {
    id: "m1-scholar",
    title: "Mate del pastor (M1)",
    difficulty: "M1",
    theme: "mate-pastor",
    level: "principiante",
    setupMoves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama ataca f7, defendida solo por el rey. ¡Captura!",
  },
  {
    id: "m1-fools",
    title: "Mate del loco (M1)",
    difficulty: "M1",
    theme: "mate-loco",
    level: "principiante",
    setupMoves: ["f3", "e5", "g4"],
    sideToMove: "b",
    solution: ["Qh4#"],
    hint: "La diagonal e1-h4 quedó abierta: la dama entra con mate.",
  },
  {
    id: "m1-caro-smothered",
    title: "Asfixia en la Caro-Kann (M1)",
    difficulty: "M1",
    theme: "asfixia",
    level: "principiante",
    setupMoves: [
      "e4",
      "c6",
      "d4",
      "d5",
      "Nc3",
      "dxe4",
      "Nxe4",
      "Nd7",
      "Qe2",
      "Ngf6",
    ],
    sideToMove: "w",
    solution: ["Nd6#"],
    hint: "El caballo salta a d6: el rey negro queda asfixiado por sus piezas.",
  },
  {
    id: "m1-budapest",
    title: "Trampa de Budapest (M1)",
    difficulty: "M1",
    theme: "trampa",
    level: "intermedio",
    setupMoves: [
      "d4",
      "Nf6",
      "c4",
      "e5",
      "dxe5",
      "Ng4",
      "Bf4",
      "Nc6",
      "Nf3",
      "Bb4+",
      "Nbd2",
      "Qe7",
      "a3",
      "Ngxe5",
      "axb4",
    ],
    sideToMove: "b",
    solution: ["Nd3#"],
    hint: "El caballo de e5 salta a d3: el rey blanco no tiene escapatoria.",
  },
  {
    id: "m2-owen",
    title: "Mate de Owen (M2)",
    difficulty: "M2",
    theme: "sacrificio",
    level: "intermedio",
    setupMoves: [
      "e4",
      "b6",
      "d4",
      "Bb7",
      "Bd3",
      "f5",
      "exf5",
      "Bxg2",
      "Qh5+",
      "g6",
      "fxg6",
      "Nf6",
    ],
    sideToMove: "w",
    solution: ["gxh7+", "Nxh5", "Bg6#"],
    hint: "El peón invade h7 con jaque al descubierto; el alfil remata en g6.",
  },
  {
    id: "m3-legal",
    title: "Trampa de Légal (M3)",
    difficulty: "M3",
    theme: "trampa",
    level: "intermedio",
    setupMoves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "d6", "Nc3", "Bg4"],
    sideToMove: "w",
    solution: ["Nxe5", "Bxd1", "Bxf7+", "Ke7", "Nd5#"],
    hint: "Sacrifica la dama: Nxe5, y tras Bxd1 el mate llega con Bxf7+ y Nd5#.",
  },
  {
    id: "m3-blackburne",
    title: "Gambito Blackburne (M3)",
    difficulty: "M3",
    theme: "trampa",
    level: "avanzado",
    setupMoves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5", "Nxf7"],
    sideToMove: "b",
    solution: ["Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"],
    hint: "Doble ataque en g2: el rey blanco queda atrapado por sus propias piezas.",
  },
  {
    id: "m3-opera",
    title: "Partida de la Ópera (M3)",
    difficulty: "M3",
    theme: "sacrificio",
    level: "avanzado",
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "d6",
      "d4",
      "Bg4",
      "dxe5",
      "Bxf3",
      "Qxf3",
      "dxe5",
      "Bc4",
      "Nf6",
      "Qb3",
      "Qe7",
      "Nc3",
      "c6",
      "Bg5",
      "b5",
      "Nxb5",
      "cxb5",
      "Bxb5+",
      "Nbd7",
      "O-O-O",
      "Rd8",
      "Rxd7",
      "Rxd7",
      "Rd1",
      "Qe6",
    ],
    sideToMove: "w",
    solution: ["Bxd7+", "Nxd7", "Qb8+", "Nxb8", "Rd8#"],
    hint: "La combinación de Morphy: Bxd7+, sacrificio de dama en b8 y Rd8#.",
  },
  {
    id: "m1-queen-technique",
    title: "Mate con dama: técnica del rey (M1)",
    difficulty: "M1",
    theme: "final",
    level: "principiante",
    placement: "7k/8/5K2/6Q1/8/8/8/8",
    sideToMove: "w",
    solution: ["Qg7#"],
    hint: "La dama se pega al rey rival, protegida por tu propio rey.",
  },
  {
    id: "m1-backrank-endgame",
    title: "El mate de pasillo (M1)",
    difficulty: "M1",
    theme: "ultima-fila",
    level: "principiante",
    placement: "6k1/5ppp/8/8/8/8/8/4R1K1",
    sideToMove: "w",
    solution: ["Re8#"],
    hint: "La torre entra a la última fila: los peones del rey le quitan el aire.",
  },
  {
    id: "m2-smothered-coz",
    title: "Mate de la coz (M2)",
    difficulty: "M2",
    theme: "asfixia",
    level: "intermedio",
    placement: "5r1k/6pp/4Q2N/8/8/8/8/1K6",
    sideToMove: "w",
    solution: ["Qg8+", "Rxg8", "Nf7#"],
    hint: "Sacrificio de dama en g8: tras la recaptura forzada, Nf7# asfixia al rey.",
  },
  {
    id: "m3-ladder",
    title: "Escalera de torres (M3)",
    difficulty: "M3",
    theme: "final",
    level: "avanzado",
    placement: "8/8/8/8/3k4/8/1R4K1/R7",
    sideToMove: "w",
    solution: [
      "Ra4+",
      "Kd3",
      "Rb3+",
      "Kd2",
      "Ra2+",
      "Kd1",
      "Rb1#",
    ],
    hint: "Las torres suben la escalera: una corta la fila y la otra da mate.",
  },
  // Puzzles generated from a public lichess dataset (verified end-to-end).
  ...EXTRA_PUZZLES,
];

// Validate a puzzle end-to-end: build position, replay the full solution and
// require a final checkmate.
export function validatePuzzle(p: Puzzle): boolean {
  const built = buildPuzzleState(p);
  if (!built.ok) return false;
  let state = built.state;
  if (state.turn !== p.sideToMove) return false;
  for (const sanRaw of p.solution) {
    const move = matchSan(state, sanRaw, generateLegalMoves(state));
    if (!move) return false;
    state = applyMove(state, move);
  }
  return getStatus(state).status === "checkmate";
}

// Defensive: a broken puzzle never reaches the UI.
export const VALID_PUZZLES: Puzzle[] = PUZZLES.filter(validatePuzzle);

// Pick the puzzle for a given day (deterministic rotation by date).
export function getPuzzleOfDay(date: Date): Puzzle {
  const dayIndex = Math.floor(
    date.getTime() / (1000 * 60 * 60 * 24)
  ) % Math.max(1, VALID_PUZZLES.length);
  return VALID_PUZZLES[dayIndex] ?? VALID_PUZZLES[0];
}

// Solve a puzzle: check if the player's SAN move matches the next
// expected solution move.
export function checkPuzzleMove(
  state: GameState,
  move: Move,
  expectedSan: string
): boolean {
  const san = toSan(state, move);
  // Compare ignoring check/mate symbols for robustness
  const norm = (s: string) => s.replace(/[+#]$/, "");
  return norm(san) === norm(expectedSan);
}
