"use client";

import { PieceColor, PieceType } from "@/lib/chess/types";

// Use the "black"/filled Unicode glyphs for both colors so shapes are
// consistent and solid; we differentiate by fill + stroke color.
const FILLED: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
}

export function ChessPiece({
  type,
  color,
  className = "",
  style,
}: ChessPieceProps) {
  const glyph = FILLED[type];
  const isWhite = color === "w";

  return (
    <span
      className={`select-none leading-none ${className}`}
      style={{
        color: isWhite ? "#f8fafc" : "#1e1b2e",
        WebkitTextStroke: isWhite
          ? "1.4px #1e1b2e"
          : "1.2px #0a0a0f",
        textShadow: isWhite
          ? "0 2px 3px rgba(15,23,42,0.45)"
          : "0 2px 3px rgba(0,0,0,0.55)",
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
        ...style,
      }}
      aria-label={`${color === "w" ? "Blancas" : "Negras"} ${type}`}
    >
      {glyph}
    </span>
  );
}
