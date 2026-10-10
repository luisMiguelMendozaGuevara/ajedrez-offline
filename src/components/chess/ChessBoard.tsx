"use client";

import { useChessGame, isKingInCheckSquare } from "@/hooks/useChessGame";
import { ChessPiece } from "./ChessPiece";
import { Square } from "@/lib/chess/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface ChessBoardProps {
  size?: number;
}

export function ChessBoard({ size }: ChessBoardProps) {
  const {
    state,
    selected,
    legalForSelected,
    lastMove,
    flipped,
    selectSquare,
    mode,
    status,
    thinking,
  } = useChessGame();

  const checkSquare = isKingInCheckSquare(state, state.turn);

  // Build the visual ordering of rows/cols based on orientation
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  // Compute legal target squares for highlighting
  const legalTargets = new Set(
    legalForSelected.map((m) => `${m.to.row}-${m.to.col}`)
  );
  const captureTargets = new Set(
    legalForSelected
      .filter((m) => m.captured || m.isEnPassant)
      .map((m) => `${m.to.row}-${m.to.col}`)
  );

  function handleSquareClick(sq: Square) {
    // In AI mode, ignore clicks when it's not the human's turn or AI is thinking
    const { thinking } = useChessGame.getState();
    if (thinking) return;
    if (mode.type === "ai" && state.turn !== mode.playerColor) return;
    selectSquare(sq);
  }

  return (
    <div
      className="relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/20"
      style={{
        background: "linear-gradient(135deg, #3a2a1a, #2a1d10)",
        padding: "clamp(6px, 1.5vw, 10px)",
        maxWidth: "min(92vw, 540px, 62vh)",
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
          {rows.map((r) =>
            cols.map((c) => {
              const isLight = (r + c) % 2 === 0;
              const piece = state.board[r][c];
              const isSelected =
                selected && selected.row === r && selected.col === c;
              const key = `${r}-${c}`;
              const isLegalTarget = legalTargets.has(key);
              const isCaptureTarget = captureTargets.has(key);
              const isLastFrom =
                lastMove && lastMove.from.row === r && lastMove.from.col === c;
              const isLastTo =
                lastMove && lastMove.to.row === r && lastMove.to.col === c;
              const isCheck =
                checkSquare && checkSquare.row === r && checkSquare.col === c;

              // Coordinate labels
              const showFileLabel = flipped ? r === 0 : r === 7;
              const showRankLabel = flipped ? c === 7 : c === 0;
              const fileChar = FILES[c];
              const rankNum = 8 - r;

              return (
                <button
                  key={key}
                  onClick={() => handleSquareClick({ row: r, col: c })}
                  className={cn(
                    "relative flex items-center justify-center transition-colors duration-100",
                    isLight ? "bg-[#ebd2a8]" : "bg-[#a87b54]"
                  )}
                  style={{
                    fontSize: size ? `${size * 0.075}px` : "clamp(1.5rem, 7vw, 2.6rem)",
                  }}
                  aria-label={`Casilla ${fileChar}${rankNum}`}
                >
                  {/* last move highlight */}
                  {(isLastFrom || isLastTo) && (
                    <span className="absolute inset-0 bg-amber-300/45 pointer-events-none" />
                  )}
                  {/* selected highlight */}
                  {isSelected && (
                    <span className="absolute inset-0 bg-emerald-400/55 pointer-events-none" />
                  )}
                  {/* check highlight */}
                  {isCheck && (
                    <span
                      className="absolute inset-0 pointer-events-none animate-pulse"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(239,68,68,0.35) 55%, transparent 75%)",
                      }}
                    />
                  )}

                  {/* coordinate labels */}
                  {showRankLabel && (
                    <span
                      className={cn(
                        "absolute top-[2px] left-[3px] text-[9px] font-bold leading-none pointer-events-none",
                        isLight ? "text-[#a87b54]" : "text-[#ebd2a8]"
                      )}
                    >
                      {rankNum}
                    </span>
                  )}
                  {showFileLabel && (
                    <span
                      className={cn(
                        "absolute bottom-[1px] right-[3px] text-[9px] font-bold leading-none pointer-events-none",
                        isLight ? "text-[#a87b54]" : "text-[#ebd2a8]"
                      )}
                    >
                      {fileChar}
                    </span>
                  )}

                  {/* piece */}
                  {piece && (
                    <ChessPiece
                      type={piece.type}
                      color={piece.color}
                      className="relative z-10"
                    />
                  )}

                  {/* legal move indicator */}
                  {isLegalTarget && !isCaptureTarget && !piece && (
                    <span className="absolute w-[30%] h-[30%] rounded-full bg-emerald-700/45 pointer-events-none z-20" />
                  )}
                  {isLegalTarget && (isCaptureTarget || piece) && (
                    <span className="absolute inset-[6%] rounded-full border-4 border-emerald-700/55 pointer-events-none z-20" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* thinking overlay */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 z-30 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-white">
                Pensando…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {status === "check" && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-amber-300 text-xs font-semibold">
          ¡Jaque!
        </div>
      )}
    </div>
  );
}
