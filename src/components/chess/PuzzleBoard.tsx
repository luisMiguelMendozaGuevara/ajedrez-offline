"use client";

import { ChessPiece } from "./ChessPiece";
import { Square } from "@/lib/chess/types";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface PuzzleBoardProps {
  board: import("@/lib/chess/types").Board;
  selected: Square | null;
  legalTargets: Set<string>;
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (sq: Square) => void;
  guideFrom?: Square | null;
  guideTo?: Square | null;
}

export function PuzzleBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  onSquareClick,
  guideFrom = null,
  guideTo = null,
}: PuzzleBoardProps) {
  const pieceSetId = useSettings((s) => s.pieceSet);
  const pieceStyleId = useSettings((s) => s.pieceStyle);
  const theme = getBoardTheme("classic");

  return (
    <div
      className="relative w-full mx-auto rounded-xl overflow-hidden shadow-xl"
      style={{
        background: theme.border,
        padding: "8px",
        maxWidth: "min(85vw, 380px)",
        aspectRatio: "1 / 1",
        boxShadow:
          "0 14px 32px -16px rgba(28,21,15,0.75), inset 0 0 0 1px rgba(198,161,91,0.45)",
      }}
    >
      <div
        className="relative w-full h-full rounded-md overflow-hidden"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(198,161,91,0.6), inset 0 2px 8px rgba(28,21,15,0.35)",
        }}
      >
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
                    backgroundColor: isLight ? theme.light : theme.dark,
                    fontSize: "clamp(1.35rem, 5.6vw, 2.25rem)",
                  }}
                  aria-label={`Casilla ${fileChar}${rankNum}`}
                >
                  {(isLastFrom || isLastTo) && (
                    <span className="absolute inset-0 bg-accent-gold/40 pointer-events-none" />
                  )}
                  {/* guide: which piece to move (pulsing gold frame) */}
                  {guideFrom &&
                    guideFrom.row === r &&
                    guideFrom.col === c &&
                    !selected && (
                      <span
                        className="absolute inset-0 pointer-events-none animate-pulse"
                        style={{
                          background: "rgba(227,166,61,0.28)",
                          boxShadow:
                            "inset 0 0 0 3px rgba(180,130,40,0.95)",
                        }}
                      />
                    )}
                  {/* guide: suggested destination (dashed ring) */}
                  {guideTo && guideTo.row === r && guideTo.col === c && (
                    <span className="absolute w-[42%] h-[42%] rounded-full border-2 border-dashed border-[#B48228]/90 pointer-events-none animate-pulse" />
                  )}
                  {isSelected && (
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "rgba(227,166,61,0.72)",
                        boxShadow:
                          "inset 0 0 0 2px rgba(120,84,32,0.95), inset 0 0 12px rgba(255,214,130,0.55)",
                      }}
                    />
                  )}
                  {r === 7 && (
                    <span
                      className="absolute bottom-[1px] right-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? theme.dark : theme.light }}
                    >
                      {fileChar}
                    </span>
                  )}
                  {c === 0 && (
                    <span
                      className="absolute top-[2px] left-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? theme.dark : theme.light }}
                    >
                      {rankNum}
                    </span>
                  )}
                  {piece && (
                    <ChessPiece
                      type={piece.type}
                      color={piece.color}
                      pieceSet={pieceSetId}
                      pieceStyle={pieceStyleId}
                      className="relative z-10"
                    />
                  )}
                  {isLegalTarget && !piece && (
                    <span className="absolute w-[28%] h-[28%] rounded-full bg-black/60 pointer-events-none z-20" />
                  )}
                  {isLegalTarget && piece && (
                    <span className="absolute inset-[8%] rounded-full border-[3px] border-black/70 pointer-events-none z-20" />
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
