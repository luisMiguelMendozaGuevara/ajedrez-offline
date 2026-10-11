"use client";

import { useChessGame, isKingInCheckSquare } from "@/hooks/useChessGame";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";
import { ChessPiece } from "./ChessPiece";
import { Square } from "@/lib/chess/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface ChessBoardProps {
  size?: number;
  blindfold?: boolean;
}

export function ChessBoard({ size, blindfold = false }: ChessBoardProps) {
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
    hintMove,
    history,
    reviewMode,
  } = useChessGame();

  // Determine if the last move was a capture (for flash animation)
  const lastEntry = history[history.length - 1];
  const lastWasCapture = !!lastEntry?.move.captured;

  const boardThemeId = useSettings((s) => s.boardTheme);
  const pieceSetId = useSettings((s) => s.pieceSet);
  const pieceStyleId = useSettings((s) => s.pieceStyle);
  const showCoordinates = useSettings((s) => s.showCoordinates);
  const highlightLastMove = useSettings((s) => s.highlightLastMove);

  const theme = getBoardTheme(boardThemeId);
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
    const { thinking, reviewMode: rm } = useChessGame.getState();
    if (thinking) return;
    if (rm) return; // ignore clicks while reviewing
    if (mode.type === "ai" && state.turn !== mode.playerColor) return;
    selectSquare(sq);
  }
  void reviewMode;

  return (
    <div
      className="relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: theme.border,
        padding: "clamp(6px, 1.5vw, 10px)",
        maxWidth: "min(92vw, 540px, 62vh)",
        aspectRatio: "1 / 1",
        boxShadow:
          "0 18px 40px -18px rgba(28,21,15,0.75), inset 0 0 0 1px rgba(198,161,91,0.45)",
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
                highlightLastMove &&
                lastMove &&
                lastMove.from.row === r &&
                lastMove.from.col === c;
              const isLastTo =
                highlightLastMove &&
                lastMove &&
                lastMove.to.row === r &&
                lastMove.to.col === c;
              const isCheck =
                checkSquare && checkSquare.row === r && checkSquare.col === c;
              const isHintFrom =
                hintMove && hintMove.from.row === r && hintMove.from.col === c;
              const isHintTo =
                hintMove && hintMove.to.row === r && hintMove.to.col === c;

              // Coordinate labels
              const showFileLabel = showCoordinates && (flipped ? r === 0 : r === 7);
              const showRankLabel = showCoordinates && (flipped ? c === 7 : c === 0);
              const fileChar = FILES[c];
              const rankNum = 8 - r;

              return (
                <button
                  key={key}
                  onClick={() => handleSquareClick({ row: r, col: c })}
                  className={cn(
                    "relative flex items-center justify-center transition-colors duration-100",
                    isLight ? "" : ""
                  )}
                  style={{
                    backgroundColor: isLight ? theme.light : theme.dark,
                    fontSize: size ? `${size * 0.082}px` : "clamp(1.7rem, 7.8vw, 2.95rem)",
                  }}
                  aria-label={`Casilla ${fileChar}${rankNum}`}
                >
                  {/* last move highlight */}
                  {(isLastFrom || isLastTo) && (
                    <span className="absolute inset-0 bg-accent-gold/40 pointer-events-none" />
                  )}
                  {/* capture flash on the target square */}
                  {isLastTo && lastWasCapture && (
                    <motion.span
                      key={`cap-${history.length}`}
                      className="absolute inset-0 pointer-events-none rounded-sm"
                      initial={{ boxShadow: "inset 0 0 0 9999px rgba(140,58,46,0.5)" }}
                      animate={{ boxShadow: "inset 0 0 0 9999px rgba(140,58,46,0)" }}
                      transition={{ duration: 0.7 }}
                    />
                  )}
                  {/* hint highlight */}
                  {(isHintFrom || isHintTo) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 0.9, 0.5] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(216,186,125,0.6), rgba(169,138,79,0.45))",
                      }}
                    />
                  )}
                  {/* selected highlight */}
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
                  {/* check highlight */}
                  {isCheck && (
                    <span
                      className="absolute inset-0 pointer-events-none animate-pulse"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(160,64,56,0.85) 0%, rgba(160,64,56,0.32) 55%, transparent 75%)",
                      }}
                    />
                  )}

                  {/* coordinate labels */}
                  {showRankLabel && (
                    <span
                      className="absolute top-[2px] left-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? theme.dark : theme.light }}
                    >
                      {rankNum}
                    </span>
                  )}
                  {showFileLabel && (
                    <span
                      className="absolute bottom-[1px] right-[3px] text-[9px] font-bold leading-none pointer-events-none opacity-80"
                      style={{ color: isLight ? theme.dark : theme.light }}
                    >
                      {fileChar}
                    </span>
                  )}

                  {/* piece (hidden in blindfold mode unless selected) */}
                  {piece && (!blindfold || isSelected) && (
                    <motion.span
                      layoutId={`piece-${r}-${c}-${piece.type}-${piece.color}`}
                      className="relative z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                      <ChessPiece
                        type={piece.type}
                        color={piece.color}
                        pieceSet={pieceSetId}
                        pieceStyle={pieceStyleId}
                      />
                    </motion.span>
                  )}

                  {/* legal move indicator */}
                  {isLegalTarget && !isCaptureTarget && !piece && (
                    <span className="absolute w-[28%] h-[28%] rounded-full bg-black/60 pointer-events-none z-20 shadow-inner" />
                  )}
                  {isLegalTarget && (isCaptureTarget || piece) && (
                    <span className="absolute inset-[8%] rounded-full border-[3px] border-black/70 pointer-events-none z-20" />
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
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-2 right-2 z-30 flex items-center gap-2 rounded-sm bg-[#241c16]/90 px-3 py-1.5 backdrop-blur shadow-lg ring-1 ring-accent-gold/40"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce" />
              </span>
              <span className="text-[11px] font-medium text-[#efe3cf]">
                Pensando…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {status === "check" && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-accent-gold-soft text-xs font-semibold drop-shadow font-display">
          ¡Jaque!
        </div>
      )}
    </div>
  );
}
