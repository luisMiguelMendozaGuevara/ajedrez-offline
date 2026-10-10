"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PuzzleBoard } from "./PuzzleBoard";
import {
  OPENINGS,
  Opening,
  buildOpeningState,
  sanToMove,
} from "@/lib/chess/openings";
import { applyMove, generateLegalMoves } from "@/lib/chess/engine";
import { Square } from "@/lib/chess/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Play,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OpeningTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpeningTutorialDialog({
  open,
  onOpenChange,
}: OpeningTutorialDialogProps) {
  const [opening, setOpening] = useState<Opening>(OPENINGS[0]);
  const [ply, setPly] = useState(0); // number of moves played so far
  const [interactive, setInteractive] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalForSelected, setLegalForSelected] = useState<
    ReturnType<typeof generateLegalMoves>
  >([]);

  // Reset when opening changes or dialog opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPly(0);
    setSelected(null);
    setLegalForSelected([]);
  }, [open, opening]);

  const { state, ok } = buildOpeningState(opening, ply);
  const currentMove = opening.moves[ply];
  const isFinished = ply >= opening.moves.length;

  const legalTargets = new Set(
    legalForSelected.map((m) => `${m.to.row}-${m.to.col}`)
  );

  const handleNext = useCallback(() => {
    if (ply < opening.moves.length) {
      setPly((p) => p + 1);
      setSelected(null);
      setLegalForSelected([]);
    }
  }, [ply, opening.moves.length]);

  const handlePrev = useCallback(() => {
    if (ply > 0) {
      setPly((p) => p - 1);
      setSelected(null);
      setLegalForSelected([]);
    }
  }, [ply]);

  const handleReset = useCallback(() => {
    setPly(0);
    setSelected(null);
    setLegalForSelected([]);
  }, []);

  // In interactive mode, the player tries to play the next expected move
  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (!interactive || isFinished) return;
      const piece = state.board[sq.row][sq.col];
      if (selected) {
        if (selected.row === sq.row && selected.col === sq.col) {
          setSelected(null);
          setLegalForSelected([]);
          return;
        }
        const targets = legalForSelected.filter(
          (m) => m.to.row === sq.row && m.to.col === sq.col
        );
        if (targets.length > 0) {
          const move =
            targets.length > 1 && targets[0].promotion
              ? targets.find((m) => m.promotion === "q") ?? targets[0]
              : targets[0];
          // Check if it matches the expected SAN
          const expectedSan = currentMove.san;
          const expectedMove = sanToMove(state, expectedSan);
          const matches =
            expectedMove &&
            move.from.row === expectedMove.from.row &&
            move.from.col === expectedMove.from.col &&
            move.to.row === expectedMove.to.row &&
            move.to.col === expectedMove.to.col;
          if (matches) {
            setPly((p) => p + 1);
            setSelected(null);
            setLegalForSelected([]);
            toast.success(`✓ ${expectedSan} · ${currentMove.comment}`);
          } else {
            toast.error(
              `Movimiento no esperado. La jugada correcta es ${expectedSan}.`
            );
            setSelected(null);
            setLegalForSelected([]);
          }
          return;
        }
        if (piece && piece.color === state.turn) {
          setLegalForSelected(generateLegalMoves(state, sq) as never);
          setSelected(sq);
          return;
        }
        setSelected(null);
        setLegalForSelected([]);
        return;
      }
      if (piece && piece.color === state.turn) {
        const legal = generateLegalMoves(state, sq);
        if (legal.length > 0) {
          setSelected(sq);
          setLegalForSelected(legal);
        }
      }
    },
    [interactive, isFinished, state, selected, legalForSelected, currentMove]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden max-h-[94vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-indigo-500" />
            Aprender aperturas
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Opening selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {OPENINGS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOpening(o)}
                className={cn(
                  "shrink-0 rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap",
                  opening.id === o.id
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {o.name}
                <span className="ml-1 text-[9px] opacity-60">{o.eco}</span>
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            {opening.description}
          </div>

          {/* Board */}
          <PuzzleBoard
            board={state.board}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={
              ply > 0
                ? (() => {
                    const prev = buildOpeningState(opening, ply - 1);
                    const mv = sanToMove(prev.state, opening.moves[ply - 1].san);
                    return mv
                      ? { from: mv.from, to: mv.to }
                      : null;
                  })()
                : null
            }
            onSquareClick={handleSquareClick}
          />

          {/* Move counter */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Jugada {Math.min(ply + 1, opening.moves.length)} /{" "}
              {opening.moves.length}
            </span>
            <span className="font-mono font-semibold">
              {ply === 0
                ? "Posición inicial"
                : `${opening.moves[ply - 1].san}`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              animate={{
                width: `${(ply / opening.moves.length) * 100}%`,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>

          {/* Comment for the next move to play, or last move's explanation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={ply}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs leading-relaxed",
                isFinished
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-indigo-500/30 bg-indigo-500/10 text-foreground"
              )}
            >
              {isFinished ? (
                <span className="flex items-start gap-2">
                  <span>✓</span>
                  <span>
                    ¡Apertura completa! Has repasado todas las jugadas de la{" "}
                    <strong>{opening.name}</strong>.
                  </span>
                </span>
              ) : (
                <span>
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {interactive ? "Tu turno: " : "Siguiente: "}
                    {currentMove.san}
                  </strong>
                  <span className="ml-1.5 text-muted-foreground">
                    {currentMove.comment}
                  </span>
                </span>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handlePrev}
              disabled={ply === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleNext}
              disabled={isFinished}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant={interactive ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 h-9",
                interactive &&
                  "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
              )}
              onClick={() => {
                setInteractive((v) => !v);
                handleReset();
                if (!interactive) {
                  toast.info(
                    "Modo interactivo: intenta reproducir la jugada correcta"
                  );
                }
              }}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {interactive ? "Modo demo" : "Probar"}
            </Button>
          </div>

          {/* Move list */}
          <details className="rounded-lg border border-border/50 overflow-hidden">
            <summary className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40">
              <BookOpen className="h-3 w-3" />
              Ver todas las jugadas ({opening.moves.length})
            </summary>
            <div className="px-3 py-2 text-[11px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 max-h-40 overflow-y-auto">
              {opening.moves.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setPly(i + 1)}
                  className={cn(
                    "col-span-2 text-left rounded px-1 py-0.5 hover:bg-muted/60 flex gap-2",
                    ply === i + 1 && "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold"
                  )}
                >
                  <span className="text-muted-foreground w-6 shrink-0">
                    {Math.floor(i / 2) + 1}
                    {i % 2 === 0 ? "." : "..."}
                  </span>
                  <span className="font-semibold shrink-0 w-12">{m.san}</span>
                  <span className="text-muted-foreground text-[10px] truncate">
                    {m.comment}
                  </span>
                </button>
              ))}
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

void applyMove;
