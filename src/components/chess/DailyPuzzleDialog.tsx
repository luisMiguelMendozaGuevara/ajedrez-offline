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
  VALID_PUZZLES,
  getPuzzleOfDay,
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
import { toSan } from "@/lib/chess/notation";
import { GameState, Move, Square } from "@/lib/chess/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Puzzle as PuzzleIcon, Lightbulb, RefreshCw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SOLVED_KEY = "chess:puzzle-solved:v1";

function loadSolvedMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SOLVED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSolvedMap(map: Record<string, number>) {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

interface DailyPuzzleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildInitialState(): GameState {
  const p = VALID_PUZZLES[0];
  return buildStateFromSans(p.setupMoves).state;
}

export function DailyPuzzleDialog({ open, onOpenChange }: DailyPuzzleDialogProps) {
  const [puzzle, setPuzzle] = useState<Puzzle>(() =>
    VALID_PUZZLES.length > 0 ? getPuzzleOfDay(new Date()) : VALID_PUZZLES[0]
  );
  const [state, setState] = useState<GameState>(() => buildInitialState());
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalForSelected, setLegalForSelected] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [solvedMap, setSolvedMap] = useState<Record<string, number>>({});

  const loadPuzzle = useCallback((p: Puzzle) => {
    const { state: s } = buildStateFromSans(p.setupMoves);
    setPuzzle(p);
    setState(s);
    setSolutionIndex(0);
    setSelected(null);
    setLegalForSelected([]);
    setLastMove(null);
    setShowHint(false);
    setSolved(!!loadSolvedMap()[p.id]);
    setAttempts(0);
  }, []);

  // Load puzzle on open
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSolvedMap(loadSolvedMap());
    const p = getPuzzleOfDay(new Date());
    loadPuzzle(p);
  }, [open, loadPuzzle]);

  const legalTargets = new Set(
    legalForSelected.map((m) => `${m.to.row}-${m.to.col}`)
  );

  const makeMove = useCallback(
    (move: Move) => {
      const expectedSan = puzzle.solution[solutionIndex];
      const isCorrect = checkPuzzleMove(state, move, expectedSan);
      setAttempts((a) => a + 1);
      if (!isCorrect) {
        toast.error("Movimiento incorrecto. ¡Prueba otra vez!");
        setSelected(null);
        setLegalForSelected([]);
        return;
      }
      const newState = applyMove(state, move);
      setLastMove({ from: move.from, to: move.to });
      setSolutionIndex((i) => i + 1);
      setSelected(null);
      setLegalForSelected([]);

      // Check if puzzle solved (no more expected solution moves)
      if (solutionIndex + 1 >= puzzle.solution.length) {
        setSolved(true);
        const map = loadSolvedMap();
        if (!map[puzzle.id]) {
          map[puzzle.id] = Date.now();
          saveSolvedMap(map);
          setSolvedMap(map);
        }
        toast.success("¡Puzzle resuelto! 🎉");
        setState(newState);
        return;
      }
      setState(newState);

      const after = getStatus(newState);
      if (after.status === "checkmate") {
        setSolved(true);
        const map = loadSolvedMap();
        if (!map[puzzle.id]) {
          map[puzzle.id] = Date.now();
          saveSolvedMap(map);
          setSolvedMap(map);
        }
        toast.success("¡Jaque mate! Puzzle resuelto 🎉");
      }
    },
    [puzzle, solutionIndex, state]
  );

  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (solved) return;
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
          // Handle promotion (default queen)
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
    [state, selected, legalForSelected, solved, makeMove]
  );

  const sideLabel = puzzle.sideToMove === "w" ? "Blancas" : "Negras";
  const status = getStatus(state);
  const gameEnded =
    status.status === "checkmate" || status.status === "stalemate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-sky-500/10 to-indigo-500/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <PuzzleIcon className="h-4 w-4 text-sky-500" />
            Desafío diario
            {solved && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                <Check className="h-3 w-3" /> Resuelto
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-semibold text-sm">{puzzle.title}</div>
              <div className="text-muted-foreground">
                Mueven las <strong>{sideLabel}</strong> ·{" "}
                <span className="text-amber-500 font-semibold">
                  {puzzle.difficulty}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              Intentos: {attempts}
            </div>
          </div>

          <PuzzleBoard
            board={state.board}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            onSquareClick={handleSquareClick}
          />

          <AnimatePresence>
            {showHint && !solved && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex gap-2 items-start"
              >
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{puzzle.hint}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {solved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-center text-sm text-emerald-700 dark:text-emerald-300 font-medium"
            >
              ✓ ¡Bien hecho! Solución: {puzzle.solution.join(" ")}
            </motion.div>
          )}

          <div className="flex gap-2">
            {!solved && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => setShowHint((v) => !v)}
              >
                <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                {showHint ? "Ocultar pista" : "Pista"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => loadPuzzle(puzzle)}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reiniciar
            </Button>
          </div>

          {VALID_PUZZLES.length > 1 && (
            <div className="border-t border-border/40 pt-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Más puzzles
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {VALID_PUZZLES.slice(0, 6).map((p) => {
                  const isSolved = !!solvedMap[p.id];
                  const isActive = p.id === puzzle.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadPuzzle(p)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-all",
                        isActive
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-border bg-card hover:border-border/80",
                        isSolved && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isSolved ? (
                        <Check className="h-3 w-3 shrink-0" />
                      ) : (
                        <X className="h-3 w-3 shrink-0 opacity-30" />
                      )}
                      <span className="truncate">{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {gameEnded && !solved && (
            <p className="text-center text-[11px] text-muted-foreground">
              La posición ha terminado. Reinicia para intentar de nuevo.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
