"use client";

import { PieceColor, PieceType } from "@/lib/chess/types";
import { PieceSetId, PieceStyleId } from "@/lib/chess/storage";
import { PIECE_SETS } from "./pieceSvg";

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
  pieceSet?: PieceSetId;
  pieceStyle?: PieceStyleId;
}

// Subtle seat shadow shared by every style so pieces sit on the board.
const SEAT = "drop-shadow(0 1px 1.5px rgba(43,33,24,0.4))";

// Each finish is a CSS filter over the piece artwork, so all variants stay
// crisp vectors instead of font glyphs.
function styleFilter(pieceStyle: PieceStyleId, isWhite: boolean): string {
  switch (pieceStyle) {
    case "walnut":
      return `sepia(0.62) saturate(0.95) hue-rotate(-8deg) ${SEAT}`;
    case "engraved":
      return `grayscale(0.4) sepia(0.28) contrast(1.3) drop-shadow(0 1px 1px rgba(43,33,24,0.5))`;
    case "silhouette":
      return isWhite
        ? `brightness(0) invert(0.93) sepia(0.4) ${SEAT}`
        : `brightness(0) ${SEAT}`;
    case "marble":
      return `grayscale(0.92) contrast(1.06) brightness(1.05) ${SEAT}`;
    case "staunton":
    default:
      return SEAT;
  }
}

export function ChessPiece({
  type,
  color,
  className = "",
  style,
  pieceSet = "merida",
  pieceStyle = "staunton",
}: ChessPieceProps) {
  const isWhite = color === "w";
  const set = PIECE_SETS[pieceSet] ?? PIECE_SETS.merida;
  const art = set[color][type];

  return (
    <svg
      viewBox={art.vb}
      role="img"
      aria-label={`${isWhite ? "Blancas" : "Negras"} ${type}`}
      className={`block select-none ${className}`}
      shapeRendering={pieceSet === "pixel8" ? "crispEdges" : undefined}
      style={{
        width: "1em",
        height: "1em",
        filter: styleFilter(pieceStyle, isWhite),
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: art.svg }}
    />
  );
}
