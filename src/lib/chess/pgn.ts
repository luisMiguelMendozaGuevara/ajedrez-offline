// PGN (Portable Game Notation) export/import utilities.
import { applyMove, generateLegalMoves, initialState } from "./engine";
import { toSan } from "./notation";
import { GameState, Move, PieceColor, GameMode } from "./types";

export interface PgnHeaders {
  event?: string;
  site?: string;
  date?: string;
  white?: string;
  black?: string;
  result?: "1-0" | "0-1" | "1/2-1/2" | "*";
  mode?: string;
  difficulty?: string;
  timeControl?: string;
}

// Build PGN string from a list of (state-before, move) pairs.
// history: array of { stateBefore, move } — stateBefore is the state prior to the move.
export function exportPgn(
  history: { stateBefore: GameState; move: Move }[],
  headers: PgnHeaders
): string {
  const lines: string[] = [];

  // Headers
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const hdrs: [string, string][] = [
    ["Event", headers.event ?? "Partida casual"],
    ["Site", headers.site ?? "Ajedrez Móvil"],
    ["Date", headers.date ?? dateStr],
    ["White", headers.white ?? "Blancas"],
    ["Black", headers.black ?? "Negras"],
    ["Result", headers.result ?? "*"],
  ];
  if (headers.mode) hdrs.push(["Mode", headers.mode]);
  if (headers.difficulty) hdrs.push(["Difficulty", headers.difficulty]);
  if (headers.timeControl) hdrs.push(["TimeControl", headers.timeControl]);

  for (const [k, v] of hdrs) {
    lines.push(`[${k} "${v}"]`);
  }

  // Movetext
  let movetext = "";
  for (let i = 0; i < history.length; i++) {
    const { stateBefore, move } = history[i];
    if (stateBefore.turn === "w") {
      movetext += `${stateBefore.fullmoveNumber}. `;
    }
    const san = toSan(stateBefore, move);
    movetext += `${san} `;
  }
  movetext += headers.result ?? "*";

  lines.push("");
  lines.push(movetext.trim());

  return lines.join("\n");
}

// Parse PGN string and replay moves to produce a list of Move objects with states.
// Returns null on parse error.
export interface ImportedGame {
  moves: { stateBefore: GameState; move: Move }[];
  headers: Record<string, string>;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
}

export function importPgn(pgn: string): ImportedGame | null {
  try {
    const lines = pgn.split(/\r?\n/);
    const headers: Record<string, string> = {};
    let movetext = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const hdrMatch = trimmed.match(/^\[(\w+)\s+"(.*)"\]$/);
      if (hdrMatch) {
        headers[hdrMatch[1]] = hdrMatch[2];
      } else {
        movetext += " " + trimmed;
      }
    }

    // Extract result token at the end
    let result: ImportedGame["result"] = "*";
    movetext = movetext.trim();
    const resultMatch = movetext.match(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/);
    if (resultMatch) {
      result = resultMatch[1] as ImportedGame["result"];
      movetext = movetext.slice(0, resultMatch.index).trim();
    }

    // Tokenize: strip move numbers and comments
    const tokens = movetext
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0 && t !== ".");

    const sans = tokens
      .filter((t) => !/^\d+\.+$/.test(t)) // remove "1." "2." etc
      .map((t) => t.replace(/^\d+\./, "")); // remove leading "1."

    // Replay
    let state = initialState();
    const moves: { stateBefore: GameState; move: Move }[] = [];

    for (const san of sans) {
      const legal = generateLegalMoves(state);
      const move = matchSanToMove(state, san, legal);
      if (!move) {
        // If we can't match a move, stop here (partial import)
        break;
      }
      moves.push({ stateBefore: state, move });
      state = applyMove(state, move);
    }

    if (moves.length === 0) return null;

    return { moves, headers, result };
  } catch {
    return null;
  }
}

// Match a SAN token to a legal move (handles +/#, castling, promotions, captures).
function matchSanToMove(
  state: GameState,
  sanRaw: string,
  legal: Move[]
): Move | null {
  if (legal.length === 0) return null;
  // Normalize: strip check/mate symbols
  const san = sanRaw.replace(/[+#]$/, "").replace(/e\.p\.?$/i, "");

  // Castling
  if (san === "O-O" || san === "0-0") {
    return legal.find((m) => m.isCastle === "k") ?? null;
  }
  if (san === "O-O-O" || san === "0-0-0") {
    return legal.find((m) => m.isCastle === "q") ?? null;
  }

  // Promotion: e8=Q, exd8=Q
  let promotion: string | null = null;
  let core = san;
  const promoMatch = core.match(/=([QRBN])$/i);
  if (promoMatch) {
    promotion = promoMatch[1].toLowerCase();
    core = core.slice(0, -2);
  }

  // Determine piece type
  let piece: string = "p";
  if (/^[KNBQR]/.test(core)) {
    piece = core[0].toLowerCase();
    core = core.slice(1);
  }

  // Now core is like "e4", "exd5", "Nbd2", "R1e2", "Qh4xe1"
  const capture = core.includes("x");
  core = core.replace("x", "");

  // The destination is the last two chars
  if (core.length < 2) return null;
  const toAlg = core.slice(-2);
  const toCol = toAlg.charCodeAt(0) - "a".charCodeAt(0);
  const toRow = 8 - parseInt(toAlg[1], 10);
  if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return null;

  // Disambiguation chars in between
  const disamb = core.slice(0, -2);
  let fromCol: number | null = null;
  let fromRow: number | null = null;
  for (const ch of disamb) {
    if (/[a-h]/.test(ch)) fromCol = ch.charCodeAt(0) - "a".charCodeAt(0);
    else if (/[1-8]/.test(ch)) fromRow = 8 - parseInt(ch, 10);
  }

  // Find matching legal move
  const candidates = legal.filter((m) => {
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
  });

  if (candidates.length === 0) return null;
  return candidates[0];
}

// Build headers from a GameMode
export function headersFromMode(
  mode: GameMode,
  winner: PieceColor | null,
  status: string
): PgnHeaders {
  let result: PgnHeaders["result"] = "*";
  if (status === "checkmate") {
    result = winner === "w" ? "1-0" : "0-1";
  } else if (status === "stalemate" || status === "draw") {
    result = "1/2-1/2";
  } else if (status === "resigned") {
    result = winner === "w" ? "1-0" : "0-1";
  }

  const whiteName =
    mode.type === "ai"
      ? mode.playerColor === "w"
        ? "Tú"
        : "Máquina"
      : "Jugador 1";
  const blackName =
    mode.type === "ai"
      ? mode.playerColor === "b"
        ? "Tú"
        : "Máquina"
      : "Jugador 2";

  return {
    result,
    white: whiteName,
    black: blackName,
    mode: mode.type === "ai" ? "IA" : "Pasarse el móvil",
    difficulty: mode.difficulty,
    timeControl: mode.timeControl
      ? `${mode.timeControl.initialSeconds}+${mode.timeControl.increment}`
      : undefined,
  };
}
