"use client";

import { ChessPiece } from "./ChessPiece";
import { Square } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface PuzzleBoardProps {
  board: import("@/lib/chess/types").Board;
  selected: Square | null;
  legalTargets: Set<string>;
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (sq: Square) => void;
}

export function PuzzleBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  onSquareClick,
}: PuzzleBoardProps) {
  return (
    <div
      className="relative w-full mx-auto rounded-xl overflow-hidden shadow-xl ring-1 ring-black/30"
      style={{
        background: "linear-gradient(135deg, #3a2a1a, #2a1d10)",
        padding: "8px",
        maxWidth: "min(85vw, 380px)",
        aspectRatio: "1 / 1",
      }}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden shadow-inner">
        <div
          className="grid w-full h-full"
          style={{
            gridTemplateColumns: "repeat(8, 1fr)",
            gridTemplateRows: "repeat(8, 1fr)",
          }}
        >
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => {
              const isLight = (r + c) % 2 === 0;
              const piece = board[r][c];
              const isSelected =
                selected && selected.row === r && selected.col === c;
              const key = `${r}-${c}`;
              const isLegalTarget = legalTargets.has(key);
              const isLastFrom =
                lastMove && lastMove.from.row === r && lastMove.from.col === c;
              const isLastTo =
                lastMove && lastMove.to.row === r && lastMove.to.col === c;
              const fileChar = FILES[c];
              const rankNum = 8 - r;
              return (
                <button
                  key={key}
                  onClick={() => onSquareClick({ row: r, col: c })}
                  className="relative flex items-center justify-center"
                  style={{
                    backgroundColor: isLight ? "#ebd2a8" : "#a87b54",
                    fontSize: "clamp(1.2rem, 5vw, 2rem)",
                  }}
                  aria-label={`Casilla ${fileChar}${rankNum}`}
                >
                  {(isLastFrom || isLastTo) && (
                    <span className="absolute inset-0 bg-amber-300/50 pointer-events-none" />
                  )}
                  {isSelected && (
                    <span className="absolute inset-0 bg-emerald-400/60 pointer-events-none" />
                  )}
                  {r === 7 && (
                    <span
                      className="absolute bottom-[1px] right-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? "#a87b54" : "#ebd2a8" }}
                    >
                      {fileChar}
                    </span>
                  )}
                  {c === 0 && (
                    <span
                      className="absolute top-[2px] left-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? "#a87b54" : "#ebd2a8" }}
                    >
                      {rankNum}
                    </span>
                  )}
                  {piece && <ChessPiece type={piece.type} color={piece.color} className="relative z-10" />}
                  {isLegalTarget && !piece && (
                    <span className="absolute w-[28%] h-[28%] rounded-full bg-emerald-700/40 pointer-events-none z-20" />
                  )}
                  {isLegalTarget && piece && (
                    <span className="absolute inset-[8%] rounded-full border-[3px] border-emerald-700/60 pointer-events-none z-20" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

void cn;
