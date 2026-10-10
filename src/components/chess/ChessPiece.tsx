"use client";

import { PieceColor, PieceType } from "@/lib/chess/types";
import { PieceStyleId } from "@/lib/chess/storage";

// Filled (black) Unicode glyphs used for both colors so shapes are solid.
const FILLED: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

// Outline (white) Unicode glyphs
const OUTLINE: Record<PieceType, string> = {
  k: "♔",
  q: "♕",
  r: "♖",
  b: "♗",
  n: "♘",
  p: "♙",
};

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
  pieceStyle?: PieceStyleId;
}

export function ChessPiece({
  type,
  color,
  className = "",
  style,
  pieceStyle = "classic",
}: ChessPieceProps) {
  const isWhite = color === "w";

  // Choose glyph set
  let glyph: string;
  let textStyle: React.CSSProperties = {};

  switch (pieceStyle) {
    case "outline":
      glyph = isWhite ? OUTLINE[type] : FILLED[type];
      textStyle = {
        color: isWhite ? "#f8fafc" : "#1e1b2e",
        WebkitTextStroke: isWhite ? "0.5px #475569" : "0.5px #0a0a0f",
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      };
      break;
    case "neon":
      glyph = FILLED[type];
      textStyle = {
        color: isWhite ? "#67e8f9" : "#c084fc",
        WebkitTextStroke: isWhite
          ? "1px #06b6d4"
          : "1px #a855f7",
        textShadow: isWhite
          ? "0 0 6px rgba(103,232,249,0.8), 0 0 12px rgba(6,182,212,0.5)"
          : "0 0 6px rgba(192,132,252,0.8), 0 0 12px rgba(168,85,247,0.5)",
        filter: "drop-shadow(0 0 3px rgba(0,0,0,0.4))",
      };
      break;
    case "wood":
      glyph = FILLED[type];
      textStyle = {
        color: isWhite ? "#f5deb3" : "#5c3317",
        WebkitTextStroke: isWhite
          ? "1.4px #8b4513"
          : "1.2px #2c1810",
        textShadow: isWhite
          ? "0 2px 3px rgba(92,51,23,0.5)"
          : "0 2px 3px rgba(0,0,0,0.6)",
        filter: "drop-shadow(0 1px 1px rgba(92,51,23,0.3))",
      };
      break;
    case "minimal":
      glyph = FILLED[type];
      textStyle = {
        color: isWhite ? "#ffffff" : "#1e293b",
        WebkitTextStroke: isWhite ? "0" : "0",
        textShadow: isWhite
          ? "0 0 0 1.5px #1e293b, 0 1px 2px rgba(0,0,0,0.3)"
          : "0 0 0 1.5px #ffffff, 0 1px 2px rgba(0,0,0,0.3)",
      };
      break;
    case "classic":
    default:
      glyph = FILLED[type];
      textStyle = {
        color: isWhite ? "#f8fafc" : "#1e1b2e",
        WebkitTextStroke: isWhite
          ? "1.4px #1e1b2e"
          : "1.2px #0a0a0f",
        textShadow: isWhite
          ? "0 2px 3px rgba(15,23,42,0.45)"
          : "0 2px 3px rgba(0,0,0,0.55)",
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
      };
      break;
  }

  return (
    <span
      className={`select-none leading-none ${className}`}
      style={{ ...textStyle, ...style }}
      aria-label={`${color === "w" ? "Blancas" : "Negras"} ${type}`}
    >
      {glyph}
    </span>
  );
}
