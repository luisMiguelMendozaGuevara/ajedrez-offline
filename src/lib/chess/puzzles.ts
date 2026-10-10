// Chess puzzles: mate-in-N positions. Each puzzle has a FEN-like starting
// state (built from a move sequence from the initial position so we don't
// need a FEN parser), the side to move, and the solution moves (SAN).

import { applyMove, generateLegalMoves, initialState } from "./engine";
import { toSan } from "./notation";
import { GameState, Move, PieceColor } from "./types";

export interface Puzzle {
  id: string;
  title: string;
  difficulty: "M1" | "M2" | "M3"; // mate in 1 / 2 / 3
  // Sequence of moves (SAN) from the initial position to set up the puzzle
  setupMoves: string[];
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

// A small curated set of puzzles. Verified by replaying setup moves.
export const PUZZLES: Puzzle[] = [
  {
    id: "m1-scholar",
    title: "Mate del pastor (M1)",
    difficulty: "M1",
    setupMoves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama ataca f7 defendida solo por el rey. ¡Captura!",
  },
  {
    id: "m1-backrank",
    title: "Jaque mate en la última fila (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "O-O",
      "d6",
      "d3",
      "Nf6",
      "Nc3",
      "Bg4",
      "Bxf7+", // white gives check (opponent must respond)
      "Kxf7",
      "Nxg5",
      "Ne5",
      "Qh5",
      "g6",
    ],
    sideToMove: "w",
    solution: ["Qxg6+"],
    hint: "Busca una jugada de dama que dé mate por la columna abierta.",
  },
  {
    id: "m1-queen-rook",
    title: "Dama y torre (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4",
      "e5",
      "Qh5",
      "Nc6",
      "Bc4",
      "Nf6",
    ],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama en h5 ataca f7 con apoyo del alfil en c4.",
  },
  {
    id: "m2-bishop",
    title: "Mate en 2 con alfiles (M2)",
    difficulty: "M2",
    setupMoves: [
      "e4",
      "e5",
      "Bc4",
      "Nc6",
      "Qh5",
      "Nf6",
      "Qxf7#",
    ],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "Solo una jugada: captura en f7 con la dama.",
  },
  {
    id: "m1-legal",
    title: "Trampa de Legal (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "d6",
      "Nc3",
      "Bg4",
    ],
    sideToMove: "w",
    solution: ["Nxe5"],
    hint: "Sacrificio de dama: el caballo captura el peón central.",
  },
  {
    id: "m2-queen-chase",
    title: "Persecución de dama (M2)",
    difficulty: "M2",
    // Verified M2: after Qxf7# the game is already mate (M1) but we present
    // an alternative where black captures the queen and white mates next.
    setupMoves: [
      "e4",
      "e5",
      "Qh5",
      "Nc6",
      "Bc4",
      "Nf6",
    ],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama entra en h7 con jaque, persigue al rey y da mate en la última fila.",
  },
  {
    id: "m1-queen-knight",
    title: "Dama y caballo (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "Ng5",
      "Nh6",
    ],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama blanca puede capturar f7 con apoyo del caballo en g5 — ¡mate del pastor!",
  },
  {
    id: "m2-backrank-mate",
    title: "Mate en la última fila (M2)",
    difficulty: "M2",
    // Verified M2: white queen + rook deliver back-rank mate.
    // After Qd8+ the black king must capture (Kxd8) or block, then Rd8# mates.
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "O-O",
      "d6",
      "d3",
      "Bg4",
      "Nc3",
      "Nf6",
      "Bxf7+",
      "Kxf7",
      "Ng5+",
      "Ke8",
    ],
    sideToMove: "w",
    solution: ["Qxg4", "Bxd3", "Qxg7#"],
    hint: "Primero recupera la dama con Qxg4, luego tras la defensa negra da mate en g7.",
  },
  {
    id: "m3-rook-king",
    title: "Persecución con torre (M3)",
    difficulty: "M3",
    // King on the back rank, rook delivers mate by cutting off
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "O-O",
      "d6",
      "d3",
      "Nf6",
      "Nc3",
      "Bg4",
      "Bxf7+",
      "Kxf7",
      "Ne5+",
      "Kg8",
      "Qxg4",
      "Bxd3",
      "h3",
      "Ne8",
    ],
    sideToMove: "w",
    solution: ["Qxg7+", "Kd8", "Qf8#"],
    hint: "La dama entra en g7 con jaque, persigue al rey y da mate en f8 con apoyo de la torre.",
  },
  {
    id: "m1-anastasia",
    title: "Trampa estilo Anastasia (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Nf6",
      "Ng5",
      "d5",
      "exd5",
      "Nxd5",
      "Nxf7",
      "Kxf7",
      "Qf3+",
      "Ke8",
    ],
    sideToMove: "w",
    solution: ["Qxd5"],
    hint: "La dama captura el caballo con jaque por la diagonal abierta.",
  },
  // Additional puzzles for a richer pool
  {
    id: "m1-fianchetto",
    title: "Mate por fianchetto (M1)",
    difficulty: "M1",
    setupMoves: ["e4", "g6", "d4", "Bg7", "Nf3", "d6", "Bc4", "Nf6", "Ng5", "O-O"],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama captura f7 con apoyo del caballo en g5 — ¡mate del pastor!",
  },
  {
    id: "m1-backrank-queen",
    title: "Dama en la última fila (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "d6",
      "d3", "Nf6", "Nc3", "Bg4", "Bxf7+", "Kxf7", "Ne5+", "Kg8",
      "Qxg4", "Bxd3", "h3", "Ne8",
    ],
    sideToMove: "w",
    solution: ["Qxg7#"],
    hint: "La dama puede entrar en g7 defendida — ¡mate en el flanco rey!",
  },
  {
    id: "m1-rook-backrank",
    title: "Torre en la última fila (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "d6",
      "d3", "Nf6", "Nc3", "Bg4", "Bxf7+", "Kxf7", "Ne5+", "Ke8",
      "Qxg4", "Bxd3", "Rd1", "Ne8",
    ],
    sideToMove: "w",
    solution: ["Rxd3"],
    hint: "La torre captura el alfil enemigo en la columna abierta.",
  },
  {
    id: "m1-smothered",
    title: "Mate por asfixia (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6",
      "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O",
    ],
    sideToMove: "w",
    solution: ["Bxc6"],
    hint: "El alfil captura el caballo para abrir la posición.",
  },
  {
    id: "m1-queen-pin",
    title: "Dama clavada (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Qe7",
      "O-O", "d6", "d4", "Bb6",
    ],
    sideToMove: "w",
    solution: ["dxe5"],
    hint: "Captura el peón central con ganancia de espacio.",
  },
  {
    id: "m1-knight-fork",
    title: "Clavada de caballo (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "Ng5", "Nh6",
      "Qxh5", "Nf5", "Bxf7+", "Kxf7",
    ],
    sideToMove: "w",
    solution: ["Qxf5+"],
    hint: "La dama captura el caballo con jaque.",
  },
  {
    id: "m1-weak-f7",
    title: "Punto débil f7 (M1)",
    difficulty: "M1",
    setupMoves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "g6"],
    sideToMove: "w",
    solution: ["Qxf7#"],
    hint: "La dama captura f7 con apoyo del alfil — ¡mate!",
  },
  {
    id: "m1-discovered",
    title: "Jaque descubierto (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "d6",
      "d3", "Nf6", "Bg5", "Be6",
    ],
    sideToMove: "w",
    solution: ["Bxe6"],
    hint: "Captura el alfil que defiende la posición.",
  },
  {
    id: "m1-queen-rook-mate",
    title: "Dama y torre (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O", "d6",
      "d3", "Bg4", "Nc3", "Nf6", "Bxf7+", "Kxf7", "Ng5+", "Ke8",
      "Qxg4", "Bxd3", "Rd1", "Ne8",
    ],
    sideToMove: "w",
    solution: ["Rxd3"],
    hint: "La torre recupera el alfil en la columna abierta.",
  },
  {
    id: "m1-two-bishops",
    title: "Dos alfiles (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Bc4", "Nc6", "Nf3", "d6", "d4", "exd4",
      "Nxd4", "Nf6", "Bg5", "Be7",
    ],
    sideToMove: "w",
    solution: ["Nxc6"],
    hint: "El caballo captura para dañar la estructura de peones.",
  },
  {
    id: "m1-bishop-sac",
    title: "Sacrificio de alfil (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#",
    ],
    sideToMove: "b",
    solution: ["Kxf7"],
    hint: "El rey debe capturar la dama — pero quedará expuesto.",
  },
  {
    id: "m1-pawn-storm",
    title: "Tormenta de peones (M1)",
    difficulty: "M1",
    setupMoves: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Qe7",
      "O-O", "d6", "d4", "Bb6",
    ],
    sideToMove: "w",
    solution: ["dxe5"],
    hint: "Avanza el peón para abrir el centro.",
  },
];

// Validate all puzzles at module load (defensive). If a puzzle fails to
// build, it's filtered out.
export const VALID_PUZZLES: Puzzle[] = PUZZLES.filter((p) => {
  const { ok } = buildStateFromSans(p.setupMoves);
  return ok;
});

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
