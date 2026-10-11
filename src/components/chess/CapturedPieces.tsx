"use client";

import { PieceColor, PieceType, PIECE_VALUES } from "@/lib/chess/types";
import { useSettings } from "@/hooks/useSettings";
import { ChessPiece } from "./ChessPiece";

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
  const pieceSetId = useSettings((s) => s.pieceSet);

  // Sort captured by value descending
  const sorted = [...captured].sort(
    (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)
  );

  // Material advantage
  const myScore = captured.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const oppScore = opponentCaptured.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const diff = Math.round((myScore - oppScore) / 100);

  return (
    <div className="flex items-center min-h-[18px] flex-wrap">
      {sorted.length === 0 ? (
        <span className="text-[10px] text-muted-foreground/60">—</span>
      ) : (
        sorted.map((p, i) => (
          <span key={i} className="-mr-1" style={{ fontSize: "15px" }}>
            <ChessPiece type={p} color={ownerColor} pieceSet={pieceSetId} />
          </span>
        ))
      )}
      {diff > 0 && (
        <span className="text-[10px] font-semibold text-accent-green dark:text-accent-green-soft ml-1.5">
          +{diff}
        </span>
      )}
    </div>
  );
}
