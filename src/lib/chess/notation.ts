import { applyMove, generateLegalMoves, isInCheck } from "./engine";
import { GameState, Move, PieceType } from "./types";
import { squareToAlgebraic } from "./engine";

// Generate Standard Algebraic Notation for a move within a state (before applying)
export function toSan(state: GameState, move: Move): string {
  if (move.isCastle === "k") return sanWithCheck(state, move, "O-O");
  if (move.isCastle === "q") return sanWithCheck(state, move, "O-O-O");

  const piece = move.piece;
  const toAlg = squareToAlgebraic(move.to);

  if (piece === "p") {
    let san = "";
    if (move.captured || move.isEnPassant) {
      san += String.fromCharCode("a".charCodeAt(0) + move.from.col) + "x";
    }
    san += toAlg;
    if (move.promotion) san += "=" + move.promotion.toUpperCase();
    return sanWithCheck(state, move, san);
  }

  // Piece move
  let san = piece.toUpperCase();

  // Disambiguation
  const ambig = findAmbiguous(state, move);
  if (ambig.needFile) san += String.fromCharCode("a".charCodeAt(0) + move.from.col);
  else if (ambig.needRank) san += String(8 - move.from.row);

  if (move.captured) san += "x";
  san += toAlg;

  return sanWithCheck(state, move, san);
}

function sanWithCheck(state: GameState, move: Move, base: string): string {
  const ns = applyMove(state, move);
  // After applying, ns.turn is the opponent. Check if opponent is in check/mate.
  const opponentMoves = generateLegalMoves(ns);
  const inCheck = isInCheck(ns.board, ns.turn);
  if (inCheck) {
    if (opponentMoves.length === 0) return base + "#";
    return base + "+";
  }
  return base;
}

interface Ambiguity {
  needFile: boolean;
  needRank: boolean;
}

function findAmbiguous(state: GameState, move: Move): Ambiguity {
  const all = generateLegalMoves(state).filter(
    (m) =>
      m.piece === move.piece &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      !(m.from.row === move.from.row && m.from.col === move.from.col)
  );
  if (all.length === 0) return { needFile: false, needRank: false };

  const sameFile = all.some((m) => m.from.col === move.from.col);
  const sameRank = all.some((m) => m.from.row === move.from.row);

  return {
    needFile: !sameFile,
    needRank: sameFile && !sameRank ? true : false,
  };
}

export function pieceLetter(type: PieceType): string {
  return type === "p" ? "" : type.toUpperCase();
}
