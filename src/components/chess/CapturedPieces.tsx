"use client";

import { PieceColor, PieceType, PIECE_VALUES, PIECE_SYMBOLS } from "@/lib/chess/types";

interface CapturedPiecesProps {
  captured: PieceType[];
  // color of the player who captured these (the owner)
  ownerColor: PieceColor;
  opponentCaptured: PieceType[];
}

const ORDER: PieceType[] = ["q", "r", "b", "n", "p"];

export function CapturedPieces({
  captured,
  ownerColor,
  opponentCaptured,
}: CapturedPiecesProps) {
  // Sort captured by value descending
  const sorted = [...captured].sort(
    (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)
  );

  // Material advantage
  const myScore = captured.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const oppScore = opponentCaptured.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const diff = Math.round((myScore - oppScore) / 100);

  return (
    <div className="flex items-center gap-1 min-h-[18px] flex-wrap">
      {sorted.length === 0 ? (
        <span className="text-[10px] text-muted-foreground/60">—</span>
      ) : (
        sorted.map((p, i) => (
          <span
            key={i}
            className="text-base leading-none -mr-1"
            style={{
              color: ownerColor === "w" ? "#f8fafc" : "#1e1b2e",
              WebkitTextStroke:
                ownerColor === "w" ? "0.8px #1e1b2e" : "0.8px #0a0a0f",
            }}
          >
            {PIECE_SYMBOLS.b[p]}
          </span>
        ))
      )}
      {diff > 0 && (
        <span className="text-[10px] font-semibold text-emerald-400 ml-1">
          +{diff}
        </span>
      )}
    </div>
  );
}
