"use client";

import { useEffect, useState } from "react";
import { PieceColor, PieceType } from "@/lib/chess/types";
import { PieceSetId, PieceStyleId } from "@/lib/chess/storage";
import type { PieceSetArt } from "./pieceSvg";

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

// The piece artwork (~400 KB of SVG for 19 sets) is only needed once a piece
// actually renders, so it is loaded on demand and shared across instances.
type PieceSets = Record<PieceSetId, PieceSetArt>;
let pieceSetsPromise: Promise<PieceSets> | null = null;

function loadPieceSets(): Promise<PieceSets> {
  if (!pieceSetsPromise) {
    pieceSetsPromise = import("./pieceSvg").then((m) => m.PIECE_SETS);
  }
  return pieceSetsPromise;
}

export function ChessPiece({
  type,
  color,
  className = "",
  style,
  pieceSet = "merida",
  pieceStyle = "staunton",
}: ChessPieceProps) {
  const [sets, setSets] = useState<PieceSets | null>(null);

  useEffect(() => {
    let alive = true;
    loadPieceSets().then((loaded) => {
      if (alive) setSets(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!sets) return null;

  const isWhite = color === "w";
  const set = sets[pieceSet] ?? sets.merida;
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
