"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PuzzleBoard } from "./PuzzleBoard";
import {
  VALID_PUZZLES,
  buildStateFromSans,
  checkPuzzleMove,
  Puzzle,
} from "@/lib/chess/puzzles";
import {
  applyMove,
  generateLegalMoves,
  getLegalMovesFrom,
  getStatus,
} from "@/lib/chess/engine";
import { GameState, Move, Square } from "@/lib/chess/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Zap, Trophy, Timer, Check, X, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PuzzleRushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RUSH_DURATION = 60; // seconds total
const TARGET_COUNT = 5; // number of puzzles to solve

interface RushResult {
  solved: number;
  failed: number;
  totalAttempts: number;
  totalTime: number;
}

type RushPhase = "idle" | "playing" | "finished";

export function PuzzleRushDialog({ open, onOpenChange }: PuzzleRushDialogProps) {
  const [phase, setPhase] = useState<RushPhase>("idle");
  const [puzzleQueue, setPuzzleQueue] = useState<Puzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [state, setState] = useState<GameState>(() => buildStateFromSans(VALID_PUZZLES[0].setupMoves).state);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalForSelected, setLegalForSelected] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [timeLeft, setTimeLeft] = useState(RUSH_DURATION);
  const [solved, setSolved] = useState(0);
  const [failed, setFailed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<RushResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("idle");
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [open]);

  const loadPuzzle = useCallback((p: Puzzle) => {
    const { state: s } = buildStateFromSans(p.setupMoves);
    setState(s);
    setSolutionIndex(0);
    setSelected(null);
    setLegalForSelected([]);
    setLastMove(null);
  }, []);

  const startRush = useCallback(() => {
    // Shuffle puzzles and pick TARGET_COUNT
    const shuffled = [...VALID_PUZZLES].sort(() => Math.random() - 0.5);
    const queue = shuffled.slice(0, Math.min(TARGET_COUNT, shuffled.length));
    // If not enough puzzles, repeat
    while (queue.length < TARGET_COUNT && VALID_PUZZLES.length > 0) {
      queue.push(VALID_PUZZLES[Math.floor(Math.random() * VALID_PUZZLES.length)]);
    }
    setPuzzleQueue(queue);
    setCurrentIdx(0);
    setSolved(0);
    setFailed(0);
    setAttempts(0);
    setTimeLeft(RUSH_DURATION);
    setResult(null);
    setPhase("playing");
    loadPuzzle(queue[0]);
  }, [loadPuzzle]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time's up
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("finished");
          setResult({
            solved: solved,
            failed: failed,
            totalAttempts: attempts,
            totalTime: RUSH_DURATION,
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, solved, failed, attempts]);

  const finishRush = useCallback(
    (finalSolved: number, finalFailed: number, finalAttempts: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("finished");
      setResult({
        solved: finalSolved,
        failed: finalFailed,
        totalAttempts: finalAttempts,
        totalTime: RUSH_DURATION - timeLeft,
      });
    },
    [timeLeft]
  );

  const goToNextPuzzle = useCallback(
    (newSolved: number, newFailed: number, newAttempts: number) => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= puzzleQueue.length) {
        // All puzzles done
        finishRush(newSolved, newFailed, newAttempts);
        return;
      }
      setCurrentIdx(nextIdx);
      loadPuzzle(puzzleQueue[nextIdx]);
    },
    [currentIdx, puzzleQueue, loadPuzzle, finishRush]
  );

  const makeMove = useCallback(
    (move: Move) => {
      const puzzle = puzzleQueue[currentIdx];
      if (!puzzle) return;
      const expectedSan = puzzle.solution[solutionIndex];
      const isCorrect = checkPuzzleMove(state, move, expectedSan);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (!isCorrect) {
        setFailed((f) => {
          const nf = f + 1;
          // Skip to next puzzle on failure
          setTimeout(() => goToNextPuzzle(solved, nf, newAttempts), 600);
          return nf;
        });
        setSelected(null);
        setLegalForSelected([]);
        return;
      }
      const newState = applyMove(state, move);
      setLastMove({ from: move.from, to: move.to });
      setSolutionIndex((i) => i + 1);
      setSelected(null);
      setLegalForSelected([]);

      // Check if puzzle solved
      if (solutionIndex + 1 >= puzzle.solution.length) {
        const status = getStatus(newState);
        if (status.status === "checkmate" || puzzle.solution.length === 1) {
          const newSolved = solved + 1;
          setSolved(newSolved);
          toast.success("¡Correcto! +1", { duration: 1200 });
          setTimeout(() => goToNextPuzzle(newSolved, failed, newAttempts), 700);
        }
      }
      setState(newState);
    },
    [puzzleQueue, currentIdx, solutionIndex, state, attempts, solved, failed, goToNextPuzzle]
  );

  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (phase !== "playing") return;
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
          makeMove(move);
          return;
        }
        if (piece && piece.color === state.turn) {
          setLegalForSelected(getLegalMovesFrom(state, sq));
          setSelected(sq);
          return;
        }
        setSelected(null);
        setLegalForSelected([]);
        return;
      }
      if (piece && piece.color === state.turn) {
        const legal = getLegalMovesFrom(state, sq);
        if (legal.length > 0) {
          setSelected(sq);
          setLegalForSelected(legal);
        }
      }
    },
    [phase, state, selected, legalForSelected, makeMove]
  );

  const legalTargets = new Set(
    legalForSelected.map((m) => `${m.to.row}-${m.to.col}`)
  );

  const timeColor = timeLeft <= 10 ? "text-rose-500" : timeLeft <= 20 ? "text-amber-500" : "text-emerald-500";
  const pct = (timeLeft / RUSH_DURATION) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden max-h-[94vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-fuchsia-500" />
            Puzzle Rush
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {phase === "idle" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/30 p-4 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl mb-2"
                >
                  ⚡
                </motion.div>
                <h3 className="text-lg font-bold">¡Reto contrarreloj!</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Resuelve <strong>{TARGET_COUNT} puzzles de mate</strong> en{" "}
                  <strong>{RUSH_DURATION} segundos</strong>. Cada fallo cuenta
                  en tu contra. ¡Ve por la máxima puntuación!
                </p>
              </div>
              <Button
                onClick={startRush}
                className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold"
              >
                <Play className="h-4 w-4 mr-2" />
                Empezar reto
              </Button>
            </div>
          )}

          {phase === "playing" && (
            <div className="space-y-3">
              {/* Timer + stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-card/60 border border-border/60 p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase">
                    <Timer className="h-3 w-3" /> Tiempo
                  </div>
                  <div className={cn("text-xl font-bold font-mono tabular-nums", timeColor)}>
                    {timeLeft}s
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                    <Check className="h-3 w-3" /> Acertados
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {solved}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 uppercase">
                    <X className="h-3 w-3" /> Fallados
                  </div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {failed}
                  </div>
                </div>
              </div>

              {/* Time bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full",
                    timeLeft <= 10
                      ? "bg-rose-500"
                      : timeLeft <= 20
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Progress: puzzle X of N */}
              <div className="text-center text-[11px] text-muted-foreground">
                Puzzle {currentIdx + 1} de {puzzleQueue.length}
                <span className="ml-2">·</span>
                <span className="ml-2 font-mono font-semibold text-foreground">
                  Mueven {state.turn === "w" ? "Blancas" : "Negras"}
                </span>
              </div>

              {/* Board */}
              <PuzzleBoard
                board={state.board}
                selected={selected}
                legalTargets={legalTargets}
                lastMove={lastMove}
                onSquareClick={handleSquareClick}
              />

              <p className="text-center text-[11px] text-muted-foreground">
                ¡Encuentra el mate! Cada fallo pasa al siguiente puzzle.
              </p>
            </div>
          )}

          {phase === "finished" && result && (
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-5 text-center"
              >
                <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold">
                  {result.solved >= TARGET_COUNT
                    ? "¡Perfecto!"
                    : result.solved >= 3
                      ? "¡Bien hecho!"
                      : "¡Sigue practicando!"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.solved} acertados de {result.totalAttempts} intentos
                </p>
              </motion.div>

              <div className="grid grid-cols-3 gap-2">
                <ResultStat label="Acertados" value={result.solved} color="emerald" />
                <ResultStat label="Fallados" value={result.failed} color="rose" />
                <ResultStat
                  label="Tiempo"
                  value={`${result.totalTime}s`}
                  color="sky"
                />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Precisión
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {result.totalAttempts > 0
                    ? Math.round((result.solved / result.totalAttempts) * 100)
                    : 0}
                  %
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => setPhase("idle")}
                >
                  Cerrar
                </Button>
                <Button
                  className="flex-1 h-10 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white"
                  onClick={startRush}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reintentar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "emerald" | "rose" | "sky";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : "text-sky-600 dark:text-sky-400";
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-2.5 text-center">
      <div className={cn("text-xl font-bold tabular-nums", colorClass)}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
