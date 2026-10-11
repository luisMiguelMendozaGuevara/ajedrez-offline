"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  PUZZLE_THEMES,
  PUZZLE_LEVELS,
  PuzzleLevel,
  getPuzzleOfDay,
  buildPuzzleState,
  checkPuzzleMove,
  matchSan,
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
import {
  Puzzle as PuzzleIcon,
  Lightbulb,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
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

const DIFFICULTY_BADGE: Record<Puzzle["difficulty"], string> = {
  M1: "border-accent-green/40 bg-accent-green/10 text-accent-green dark:text-accent-green-soft",
  M2: "border-accent-gold/40 bg-accent-gold/10 text-accent-gold dark:text-accent-gold-soft",
  M3: "border-accent-wine/40 bg-accent-wine/10 text-accent-wine dark:text-accent-wine-soft",
};

const DIFFICULTY_ORDER: Record<Puzzle["difficulty"], number> = {
  M1: 0,
  M2: 1,
  M3: 2,
};

// Global puzzle list ordered easy → hard (stable sort keeps the curated pool
// first within each difficulty). Used by "Continuar práctica" and collections.
const PUZZLES_BY_DIFFICULTY: Puzzle[] = [...VALID_PUZZLES].sort(
  (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
);

const THEME_BY_ID = new Map(PUZZLE_THEMES.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------
// Collections model: the explorer is no longer a flat filtered list; puzzles
// are grouped into visual collections (difficulty, level, theme, special).
// ---------------------------------------------------------------------------

type CollectionGroup = "difficulty" | "level" | "theme" | "special";

interface PuzzleCollection {
  id: string;
  name: string;
  emoji: string;
  group: CollectionGroup;
  matches: (p: Puzzle) => boolean;
}

const COLLECTION_GROUP_ORDER: CollectionGroup[] = [
  "difficulty",
  "level",
  "theme",
  "special",
];

const COLLECTION_GROUP_LABELS: Record<CollectionGroup, string> = {
  difficulty: "Por dificultad",
  level: "Por nivel",
  theme: "Por tema",
  special: "Especiales",
};

const LEVEL_EMOJI: Record<PuzzleLevel, string> = {
  principiante: "🌱",
  intermedio: "🎓",
  avanzado: "👑",
};

const COLLECTIONS: PuzzleCollection[] = [
  // By difficulty
  {
    id: "mates-1",
    name: "Mates en 1",
    emoji: "🎯",
    group: "difficulty",
    matches: (p) => p.difficulty === "M1",
  },
  {
    id: "mates-2",
    name: "Mates en 2",
    emoji: "⚔️",
    group: "difficulty",
    matches: (p) => p.difficulty === "M2",
  },
  {
    id: "mates-3",
    name: "Mates en 3",
    emoji: "🧠",
    group: "difficulty",
    matches: (p) => p.difficulty === "M3",
  },
  // By level
  ...PUZZLE_LEVELS.map(
    (l): PuzzleCollection => ({
      id: `nivel-${l.id}`,
      name: l.label,
      emoji: LEVEL_EMOJI[l.id],
      group: "level",
      matches: (p) => p.level === l.id,
    })
  ),
  // By theme
  ...PUZZLE_THEMES.map(
    (t): PuzzleCollection => ({
      id: `tema-${t.id}`,
      name: t.label,
      emoji: t.emoji,
      group: "theme",
      matches: (p) => p.theme === t.id,
    })
  ),
  // Special pools (by id prefix: web-* real games, gen-* lichess dataset)
  {
    id: "partidas-reales",
    name: "Partidas reales",
    emoji: "🏛️",
    group: "special",
    matches: (p) => p.id.startsWith("web-"),
  },
  {
    id: "clasicos",
    name: "Clásicos",
    emoji: "🏰",
    group: "special",
    matches: (p) => !p.id.startsWith("gen-") && !p.id.startsWith("web-"),
  },
];

interface CollectionCardProps {
  name: string;
  emoji: string;
  count: number;
  solvedCount: number;
  onClick: () => void;
}

function CollectionCard({
  name,
  emoji,
  count,
  solvedCount,
  onClick,
}: CollectionCardProps) {
  const pct = count > 0 ? Math.round((solvedCount / count) * 100) : 0;
  const complete = count > 0 && solvedCount === count;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-all hover:border-accent-slate/60 hover:bg-accent-slate/5"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl leading-none">{emoji}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold leading-snug">
          {name}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {count} {count === 1 ? "puzzle" : "puzzles"}
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-accent-green/15">
          <div
            className="h-full rounded-full bg-accent-green transition-all duration-500 dark:bg-accent-green-soft"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={cn(
            "text-[10px]",
            complete
              ? "font-semibold text-accent-green dark:text-accent-green-soft"
              : "text-muted-foreground"
          )}
        >
          Resueltos {solvedCount}/{count}
        </div>
      </div>
    </button>
  );
}

interface DailyPuzzleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildInitialState(): GameState {
  const p = VALID_PUZZLES[0];
  return buildPuzzleState(p).state;
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
  // Navigation: home (landing with daily puzzle + collections) or an open
  // collection (same board on top, collection list below).
  const [view, setView] = useState<"home" | "collection">("home");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [puzzleOfDayId, setPuzzleOfDayId] = useState(() =>
    VALID_PUZZLES.length > 0 ? getPuzzleOfDay(new Date()).id : ""
  );

  const boardRef = useRef<HTMLDivElement | null>(null);
  const homeRef = useRef<HTMLDivElement | null>(null);
  const collectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToBoard = useCallback(() => {
    requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const loadPuzzle = useCallback((p: Puzzle) => {
    const { state: s } = buildPuzzleState(p);
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

  // Load a puzzle and bring the board into view (keeps the current view, per
  // the collection browsing flow).
  const goToPuzzle = useCallback(
    (p: Puzzle) => {
      loadPuzzle(p);
      scrollToBoard();
    },
    [loadPuzzle, scrollToBoard]
  );

  const openCollection = useCallback((id: string) => {
    setCollectionId(id);
    setView("collection");
    requestAnimationFrame(() => {
      collectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const backToHome = useCallback(() => {
    setView("home");
    setCollectionId(null);
    requestAnimationFrame(() => {
      homeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Start (or restart) the session: always the daily puzzle, always home.
  const startSession = useCallback(() => {
    const pod = getPuzzleOfDay(new Date());
    setPuzzleOfDayId(pod.id);
    setView("home");
    setCollectionId(null);
    loadPuzzle(pod);
  }, [loadPuzzle]);

  // Load puzzle on open
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSolvedMap(loadSolvedMap());
    startSession();
  }, [open, startSession]);

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
      const newSolutionIndex = solutionIndex + 1;
      setSolutionIndex(newSolutionIndex);
      setSelected(null);
      setLegalForSelected([]);

      // Check if puzzle solved (no more expected solution moves)
      if (newSolutionIndex >= puzzle.solution.length) {
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
        return;
      }

      // Auto-play the opponent's reply (odd index) after a short delay
      const nextSan = puzzle.solution[newSolutionIndex];
      if (nextSan && newSolutionIndex % 2 === 1) {
        setTimeout(() => {
          // Re-derive state from the closure since setState is async
          const legal = generateLegalMoves(newState);
          const oppMove = matchSan(newState, nextSan, legal);
          if (!oppMove) return;
          const afterOpp = applyMove(newState, oppMove);
          setLastMove({ from: oppMove.from, to: oppMove.to });
          setSolutionIndex((i) => i + 1);
          setState(afterOpp);

          // Check if puzzle now solved after opponent reply (shouldn't normally)
          if (newSolutionIndex + 1 >= puzzle.solution.length) {
            setSolved(true);
            const m2 = loadSolvedMap();
            if (!m2[puzzle.id]) {
              m2[puzzle.id] = Date.now();
              saveSolvedMap(m2);
              setSolvedMap(m2);
            }
          }
        }, 700);
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

  const themeMeta = THEME_BY_ID.get(puzzle.theme);

  const solvedCount = VALID_PUZZLES.filter((p) => !!solvedMap[p.id]).length;
  const progressPct =
    VALID_PUZZLES.length > 0
      ? Math.round((solvedCount / VALID_PUZZLES.length) * 100)
      : 0;

  // "Continuar práctica": first unsolved puzzle in M1 → M2 → M3 order.
  const nextUnsolved = useMemo(
    () => PUZZLES_BY_DIFFICULTY.find((p) => !solvedMap[p.id]) ?? null,
    [solvedMap]
  );

  // Collection cards with live counts + progress.
  const collectionCards = useMemo(
    () =>
      COLLECTIONS.map((c) => {
        const puzzles = PUZZLES_BY_DIFFICULTY.filter((p) => c.matches(p));
        return {
          ...c,
          puzzles,
          solvedCount: puzzles.filter((p) => !!solvedMap[p.id]).length,
        };
      }),
    [solvedMap]
  );

  const activeCollection =
    collectionCards.find((c) => c.id === collectionId) ?? null;

  const collectionPct =
    activeCollection && activeCollection.puzzles.length > 0
      ? Math.round(
          (activeCollection.solvedCount / activeCollection.puzzles.length) * 100
        )
      : 0;

  const nextInCollection =
    activeCollection?.puzzles.find((p) => !solvedMap[p.id]) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-accent-slate/10 to-accent-slate/5">
          <DialogTitle className="flex items-center gap-2 pr-8 text-base font-display">
            <PuzzleIcon className="h-4 w-4 shrink-0 text-accent-slate dark:text-accent-slate-soft" />
            Desafío diario
            {solved && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-accent-green/15 text-accent-green dark:text-accent-green-soft px-2 py-0.5 text-[10px] font-semibold">
                <Check className="h-3 w-3" /> Resuelto
              </span>
            )}
          </DialogTitle>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>
                Resueltos{" "}
                <span className="font-semibold text-accent-green dark:text-accent-green-soft">
                  {solvedCount}/{VALID_PUZZLES.length}
                </span>
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-green/15">
              <div
                className="h-full rounded-full bg-accent-green transition-all duration-500 dark:bg-accent-green-soft"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Puzzle activo (del día por defecto) */}
          <div
            ref={boardRef}
            className="scroll-mt-3 space-y-3 rounded-xl border border-border/60 bg-card/60 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug">
                  {puzzle.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {puzzle.id === puzzleOfDayId && (
                    <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent-gold dark:text-accent-gold-soft">
                      ⭐ Del día
                    </span>
                  )}
                  <span>
                    Mueven las{" "}
                    <strong className="text-foreground">{sideLabel}</strong>
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      DIFFICULTY_BADGE[puzzle.difficulty]
                    )}
                  >
                    {puzzle.difficulty}
                  </span>
                  {themeMeta && (
                    <span className="rounded-full border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] leading-none">
                      {themeMeta.emoji} {themeMeta.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right text-[10px] text-muted-foreground">
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
                  className="rounded-lg bg-accent-gold/10 border border-accent-gold/30 px-3 py-2 text-xs text-accent-gold dark:text-accent-gold-soft flex gap-2 items-start"
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
                className="rounded-lg bg-accent-green/10 border border-accent-green/30 px-3 py-2.5 text-center text-sm text-accent-green dark:text-accent-green-soft font-medium"
              >
                ✓ ¡Bien hecho! Solución: {puzzle.solution.join(" ")}
              </motion.div>
            )}

            {gameEnded && !solved && (
              <p className="text-center text-[11px] text-muted-foreground">
                La posición ha terminado. Reinicia para intentar de nuevo.
              </p>
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
          </div>

          {view === "collection" && activeCollection ? (
            /* Vista colección: lista de puzzles + cabecera con progreso */
            <div
              ref={collectionRef}
              className="scroll-mt-3 space-y-3 rounded-xl border border-border/60 bg-card/60 p-3"
            >
              <button
                type="button"
                onClick={backToHome}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Colecciones
              </button>

              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-2xl leading-none">
                    {activeCollection.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold leading-snug">
                      {activeCollection.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {activeCollection.puzzles.length}{" "}
                      {activeCollection.puzzles.length === 1
                        ? "puzzle"
                        : "puzzles"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                  Resueltos{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      activeCollection.solvedCount ===
                        activeCollection.puzzles.length &&
                        activeCollection.puzzles.length > 0 &&
                        "text-accent-green dark:text-accent-green-soft"
                    )}
                  >
                    {activeCollection.solvedCount}/
                    {activeCollection.puzzles.length}
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-green/15">
                <div
                  className="h-full rounded-full bg-accent-green transition-all duration-500 dark:bg-accent-green-soft"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-9"
                disabled={!nextInCollection}
                onClick={() => nextInCollection && goToPuzzle(nextInCollection)}
              >
                <Play className="h-3.5 w-3.5" />
                {activeCollection.puzzles.length === 0
                  ? "Sin puzzles"
                  : nextInCollection
                    ? "Resolver el siguiente"
                    : "¡Colección completada! 🎉"}
              </Button>

              <div className="max-h-60 space-y-1 overflow-y-auto pr-0.5">
                {activeCollection.puzzles.map((p) => {
                  const isSolved = !!solvedMap[p.id];
                  const isActive = p.id === puzzle.id;
                  const pTheme = THEME_BY_ID.get(p.theme);
                  return (
                    <button
                      key={p.id}
                      onClick={() => goToPuzzle(p)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-all",
                        isActive
                          ? "border-accent-slate bg-accent-slate/10"
                          : "border-border bg-card hover:border-border/80"
                      )}
                    >
                      <span className="shrink-0 text-sm leading-none">
                        {pTheme?.emoji ?? "♟"}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold leading-none",
                          DIFFICULTY_BADGE[p.difficulty]
                        )}
                      >
                        {p.difficulty}
                      </span>
                      {isSolved && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-accent-green dark:text-accent-green-soft" />
                      )}
                    </button>
                  );
                })}
                {activeCollection.puzzles.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    Sin puzzles en esta colección.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vista home: continuar práctica + grid de colecciones */
            <div ref={homeRef} className="scroll-mt-3 space-y-4">
              <div className="space-y-1.5">
                {nextUnsolved ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full h-10 font-semibold"
                      onClick={() => goToPuzzle(nextUnsolved)}
                    >
                      <Play className="h-4 w-4" />
                      Continuar práctica
                    </Button>
                    <p className="truncate text-center text-[10px] text-muted-foreground">
                      Siguiente: {nextUnsolved.title}
                    </p>
                  </>
                ) : (
                  <Button
                    size="lg"
                    className="w-full h-10 font-semibold"
                    disabled
                  >
                    🏆 ¡Todos resueltos!
                  </Button>
                )}
              </div>

              <div className="border-t border-border/40 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Colecciones
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {COLLECTIONS.length} colecciones
                  </div>
                </div>

                {COLLECTION_GROUP_ORDER.map((group) => {
                  const cards = collectionCards.filter(
                    (c) => c.group === group
                  );
                  if (cards.length === 0) return null;
                  return (
                    <div key={group} className="space-y-2">
                      <div className="px-0.5 text-[10px] font-semibold text-muted-foreground">
                        {COLLECTION_GROUP_LABELS[group]}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cards.map((c) => (
                          <CollectionCard
                            key={c.id}
                            name={c.name}
                            emoji={c.emoji}
                            count={c.puzzles.length}
                            solvedCount={c.solvedCount}
                            onClick={() => openCollection(c.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
