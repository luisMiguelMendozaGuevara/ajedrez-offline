"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PuzzleBoard } from "./PuzzleBoard";
import { OpeningMove, sanToMove } from "@/lib/chess/openings";
import { getLegalMovesFrom } from "@/lib/chess/engine";
import { GameState, Move, Square } from "@/lib/chess/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Play,
  RotateCcw,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LinePlayerAccent = "plum" | "wine" | "green";

interface LinePlayerProps {
  lineId: string;
  moves: OpeningMove[];
  getStateAtPly: (ply: number) => { state: GameState; ok: boolean };
  allowInteractive?: boolean;
  highlightPly?: number;
  onFirstComplete?: () => void;
  finishMessage: string;
  accent?: LinePlayerAccent;
}

const ACCENTS: Record<
  LinePlayerAccent,
  {
    strong: string;
    box: string;
    button: string;
    bar: string;
    activeRow: string;
    chip: string;
  }
> = {
  plum: {
    strong: "text-accent-plum dark:text-accent-plum-soft",
    box: "border-accent-plum/30 bg-accent-plum/10 text-foreground",
    button:
      "bg-accent-plum hover:bg-accent-plum/90 text-[#F3EBD8] border-accent-plum",
    bar: "from-accent-plum to-accent-plum/40",
    activeRow:
      "bg-accent-plum/15 text-accent-plum dark:text-accent-plum-soft font-bold",
    chip: "bg-accent-plum/15 text-accent-plum dark:text-accent-plum-soft",
  },
  wine: {
    strong: "text-accent-wine dark:text-accent-wine-soft",
    box: "border-accent-wine/30 bg-accent-wine/10 text-foreground",
    button:
      "bg-accent-wine hover:bg-accent-wine/90 text-[#F3EBD8] border-accent-wine",
    bar: "from-accent-wine to-accent-wine/40",
    activeRow:
      "bg-accent-wine/15 text-accent-wine dark:text-accent-wine-soft font-bold",
    chip: "bg-accent-wine/15 text-accent-wine dark:text-accent-wine-soft",
  },
  green: {
    strong: "text-accent-green dark:text-accent-green-soft",
    box: "border-accent-green/30 bg-accent-green/10 text-foreground",
    button:
      "bg-accent-green hover:bg-accent-green/90 text-[#F3EBD8] border-accent-green",
    bar: "from-accent-green to-accent-green/40",
    activeRow:
      "bg-accent-green/15 text-accent-green dark:text-accent-green-soft font-bold",
    chip: "bg-accent-green/15 text-accent-green dark:text-accent-green-soft",
  },
};

export function LinePlayer({
  lineId,
  moves,
  getStateAtPly,
  allowInteractive = false,
  highlightPly,
  onFirstComplete,
  finishMessage,
  accent = "plum",
}: LinePlayerProps) {
  const [ply, setPly] = useState(0);
  const [interactive, setInteractive] = useState(false);
  const [guide, setGuide] = useState(true);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalForSelected, setLegalForSelected] = useState<Move[]>([]);
  const [prevLineId, setPrevLineId] = useState(lineId);
  const completedRef = useRef<string | null>(null);

  if (prevLineId !== lineId) {
    setPrevLineId(lineId);
    setPly(0);
    setSelected(null);
    setLegalForSelected([]);
  }

  const { state, ok, lastMove } = useMemo(() => {
    const current = getStateAtPly(ply);
    let last: { from: Square; to: Square } | null = null;
    if (ply > 0) {
      const prev = getStateAtPly(ply - 1);
      const mv = sanToMove(prev.state, moves[ply - 1].san);
      if (mv) last = { from: mv.from, to: mv.to };
    }
    return { state: current.state, ok: current.ok, lastMove: last };
  }, [ply, getStateAtPly, moves]);

  const a = ACCENTS[accent];
  const currentMove = moves[ply];
  const isFinished = ply >= moves.length;
  const isKeyPly = highlightPly != null && ply === highlightPly;
  const progress = moves.length > 0 ? (ply / moves.length) * 100 : 0;

  // The move the learner should play next (drives the visual guide).
  const expected = useMemo(() => {
    if (isFinished || !currentMove) return null;
    return sanToMove(state, currentMove.san);
  }, [state, currentMove, isFinished]);

  const legalTargets = new Set(
    legalForSelected.map((m) => `${m.to.row}-${m.to.col}`)
  );

  const markCompleted = useCallback(() => {
    if (completedRef.current !== lineId) {
      completedRef.current = lineId;
      onFirstComplete?.();
    }
  }, [lineId, onFirstComplete]);

  const handleNext = useCallback(() => {
    if (ply >= moves.length) return;
    const next = ply + 1;
    setPly(next);
    setSelected(null);
    setLegalForSelected([]);
    if (next >= moves.length) markCompleted();
  }, [ply, moves.length, markCompleted]);

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

  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (!interactive || !allowInteractive || isFinished || !ok) return;
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
          const expectedSan = currentMove.san;
          const expectedMove = sanToMove(state, expectedSan);
          const matches =
            expectedMove &&
            move.from.row === expectedMove.from.row &&
            move.from.col === expectedMove.from.col &&
            move.to.row === expectedMove.to.row &&
            move.to.col === expectedMove.to.col;
          if (matches) {
            const next = ply + 1;
            setPly(next);
            setSelected(null);
            setLegalForSelected([]);
            toast.success(`✓ ${expectedSan} · ${currentMove.comment}`);
            if (next >= moves.length) markCompleted();
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
    [
      interactive,
      allowInteractive,
      isFinished,
      ok,
      state,
      selected,
      legalForSelected,
      currentMove,
      ply,
      moves.length,
      markCompleted,
    ]
  );

  return (
    <div className="space-y-3">
      <PuzzleBoard
        board={state.board}
        selected={selected}
        legalTargets={legalTargets}
        lastMove={lastMove}
        onSquareClick={handleSquareClick}
        guideFrom={guide && expected ? expected.from : null}
        guideTo={guide && !interactive && expected ? expected.to : null}
      />

      {!ok && (
        <div className="flex items-start gap-2 rounded-lg border border-accent-wine/40 bg-accent-wine/10 px-3 py-2 text-[11px] text-accent-wine dark:text-accent-wine-soft">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            No se pudo reconstruir la posición: esta línea contiene una jugada
            inválida.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Jugada {Math.min(ply + 1, moves.length)} / {moves.length}
        </span>
        <span className="flex items-center gap-1.5">
          {isKeyPly && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                a.chip
              )}
            >
              <Star className="h-2.5 w-2.5" />
              Momento clave
            </span>
          )}
          <span className="font-mono font-semibold">
            {ply === 0 ? "Posición inicial" : moves[ply - 1].san}
          </span>
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full bg-gradient-to-r", a.bar)}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

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
              ? "border-accent-green/40 bg-accent-green/10 text-accent-green dark:text-accent-green-soft"
              : a.box
          )}
        >
          {isFinished ? (
            <span className="flex items-start gap-2">
              <span>✓</span>
              <span>{finishMessage}</span>
            </span>
          ) : (
            <span>
              <strong className={a.strong}>
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

      {guide && interactive && allowInteractive && !isFinished && !selected && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-accent-gold dark:text-accent-gold-soft">
          <MousePointerClick className="h-3 w-3" />
          Toca la pieza resaltada para jugar {currentMove.san}
        </div>
      )}

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
          variant="outline"
          size="sm"
          className={cn("h-9 w-9 p-0", guide && a.chip)}
          title={guide ? "Ocultar guía de piezas" : "Mostrar guía de piezas"}
          onClick={() => setGuide((v) => !v)}
        >
          <MousePointerClick className="h-4 w-4" />
        </Button>
        {allowInteractive && (
          <Button
            variant={interactive ? "default" : "outline"}
            size="sm"
            className={cn("flex-1 h-9", interactive && a.button)}
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
        )}
      </div>

      <details className="rounded-lg border border-border/50 overflow-hidden">
        <summary className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40">
          <BookOpen className="h-3 w-3" />
          Ver todas las jugadas ({moves.length})
        </summary>
        <div className="px-3 py-2 text-[11px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 max-h-40 overflow-y-auto">
          {moves.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                setPly(i + 1);
                setSelected(null);
                setLegalForSelected([]);
              }}
              className={cn(
                "col-span-2 text-left rounded px-1 py-0.5 hover:bg-muted/60 flex gap-2 items-baseline",
                ply === i + 1 && a.activeRow,
                highlightPly === i + 1 && "ring-1 ring-accent-wine/50"
              )}
            >
              <span className="text-muted-foreground w-6 shrink-0">
                {Math.floor(i / 2) + 1}
                {i % 2 === 0 ? "." : "..."}
              </span>
              <span className="font-semibold shrink-0 w-12">{m.san}</span>
              <span className="text-muted-foreground text-[10px] truncate flex-1">
                {m.comment}
              </span>
              {highlightPly === i + 1 && (
                <span className="shrink-0 font-sans text-[9px] font-semibold text-accent-wine dark:text-accent-wine-soft">
                  clave
                </span>
              )}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
