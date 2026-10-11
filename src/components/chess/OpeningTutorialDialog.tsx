"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinePlayer } from "./LinePlayer";
import {
  OPENING_CATEGORY_LABELS,
  LEVEL_LABELS,
  VALID_OPENINGS,
  OpeningCategory,
  LearningLevel,
  buildOpeningState,
} from "@/lib/chess/openings";
import { VALID_GAMES, FamousGame } from "@/lib/chess/games";
import { PRINCIPLES, PrincipleCard } from "@/lib/chess/principles";
import { RULES, RULE_GROUP_LABELS } from "@/lib/chess/rules";
import { VALID_TRAPS, Trap } from "@/lib/chess/traps";
import {
  VALID_ENDGAMES,
  EndgameLesson,
  buildEndgameState,
} from "@/lib/chess/endgames";
import { ChessPiece } from "./ChessPiece";
import { MiniBoard } from "./MiniBoard";
import { useLearnProgress } from "@/hooks/useLearnProgress";
import {
  MISSIONS,
  computeMissionProgress,
  loadGamesViewed,
  loadMissionsDone,
  markGameViewed,
  saveMissionDone,
} from "@/lib/chess/missions";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  GraduationCap,
  Lightbulb,
  ScrollText,
  Swords,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface OpeningTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRINCIPLE_CATEGORY_LABELS: Record<PrincipleCard["category"], string> = {
  apertura: "Apertura",
  "medio juego": "Medio juego",
  final: "Final",
};

const GOAL_LABELS: Record<EndgameLesson["goal"], string> = {
  mate: "Mate",
  promocion: "Promoción",
  tablas: "Tablas",
  tecnica: "Técnica",
};

const RESULT_STYLES: Record<FamousGame["result"], string> = {
  "1-0": "bg-accent-green/15 text-accent-green dark:text-accent-green-soft",
  "0-1": "bg-accent-wine/15 text-accent-wine dark:text-accent-wine-soft",
  "1/2-1/2": "bg-muted text-muted-foreground",
};

type SectionId =
  | "reglas"
  | "misiones"
  | "principios"
  | "aperturas"
  | "trampas"
  | "finales"
  | "partidas";

interface SectionMeta {
  id: SectionId;
  title: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: SectionMeta[] = [
  {
    id: "reglas",
    title: "Reglas",
    description: "Cómo se juega: piezas, jaque mate y reglas especiales",
    icon: ScrollText,
  },
  {
    id: "misiones",
    title: "Misiones",
    description: "Rutas guiadas con objetivos y recompensas",
    icon: Target,
  },
  {
    id: "principios",
    title: "Principios",
    description: "Ideas esenciales para jugar mejor",
    icon: Lightbulb,
  },
  {
    id: "aperturas",
    title: "Aperturas",
    description: "16 aperturas con ideas clave y modo interactivo",
    icon: BookOpen,
  },
  {
    id: "trampas",
    title: "Trampas",
    description: "Celadas clásicas para tenderlas y evitarlas",
    icon: Zap,
  },
  {
    id: "finales",
    title: "Finales",
    description: "Mates y técnicas esenciales del final",
    icon: Crown,
  },
  {
    id: "partidas",
    title: "Partidas",
    description: "Partidas legendarias comentadas jugada a jugada",
    icon: Swords,
  },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "border-accent-plum bg-accent-plum/15 text-accent-plum dark:text-accent-plum-soft"
          : "border-border text-muted-foreground hover:border-accent-plum/40"
      )}
    >
      {children}
    </button>
  );
}

export function OpeningTutorialDialog({
  open,
  onOpenChange,
}: OpeningTutorialDialogProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LearningLevel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<OpeningCategory | null>(
    null
  );
  const [gameLevelFilter, setGameLevelFilter] = useState<LearningLevel | null>(
    null
  );
  const [openingId, setOpeningId] = useState(VALID_OPENINGS[0]?.id ?? "");
  const [trapId, setTrapId] = useState(VALID_TRAPS[0]?.id ?? "");
  const [endgameId, setEndgameId] = useState(VALID_ENDGAMES[0]?.id ?? "");
  const [gameId, setGameId] = useState(VALID_GAMES[0]?.id ?? "");
  const [expandedPrincipleId, setExpandedPrincipleId] = useState<string | null>(
    null
  );
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(
    "tablero"
  );
  const [missionsRefreshKey, setMissionsRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const viewedOpenings = useLearnProgress((s) => s.viewedOpenings);
  const understoodTraps = useLearnProgress((s) => s.understoodTraps);
  const completedEndgames = useLearnProgress((s) => s.completedEndgames);
  const readPrinciples = useLearnProgress((s) => s.readPrinciples);
  const readRules = useLearnProgress((s) => s.readRules);
  const markOpeningViewed = useLearnProgress((s) => s.markOpeningViewed);
  const unmarkOpeningViewed = useLearnProgress((s) => s.unmarkOpeningViewed);
  const toggleTrapUnderstood = useLearnProgress((s) => s.toggleTrapUnderstood);
  const toggleEndgameCompleted = useLearnProgress(
    (s) => s.toggleEndgameCompleted
  );
  const togglePrincipleRead = useLearnProgress((s) => s.togglePrincipleRead);
  const toggleRuleRead = useLearnProgress((s) => s.toggleRuleRead);

  const filteredOpenings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VALID_OPENINGS.filter((o) => {
      if (levelFilter && o.level !== levelFilter) return false;
      if (categoryFilter && o.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.eco.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      );
    });
  }, [search, levelFilter, categoryFilter]);

  const filteredGames = useMemo(
    () =>
      VALID_GAMES.filter(
        (g) => gameLevelFilter === null || g.level === gameLevelFilter
      ),
    [gameLevelFilter]
  );

  const opening =
    VALID_OPENINGS.find((o) => o.id === openingId) ?? VALID_OPENINGS[0];
  const trap = VALID_TRAPS.find((t) => t.id === trapId) ?? VALID_TRAPS[0];
  const endgame =
    VALID_ENDGAMES.find((l) => l.id === endgameId) ?? VALID_ENDGAMES[0];
  const game = VALID_GAMES.find((g) => g.id === gameId) ?? VALID_GAMES[0];

  const viewedCount = VALID_OPENINGS.filter((o) => viewedOpenings[o.id]).length;
  const understoodCount = VALID_TRAPS.filter((t) =>
    understoodTraps.includes(t.id)
  ).length;
  const completedCount = VALID_ENDGAMES.filter((l) =>
    completedEndgames.includes(l.id)
  ).length;
  const readCount = PRINCIPLES.filter((p) =>
    readPrinciples.includes(p.id)
  ).length;
  const readRulesCount = RULES.filter((r) => readRules.includes(r.id)).length;

  const missionsProgress = useMemo(() => {
    // Recompute when the dialog opens or the Missions tab is (re)selected:
    // progress lives in localStorage (learn progress, puzzles, stats),
    // outside zustand's reactive store.
    void open;
    void missionsRefreshKey;
    return computeMissionProgress();
  }, [open, missionsRefreshKey]);

  useEffect(() => {
    if (!open) return;
    const doneMap = loadMissionsDone();
    const newlyCompleted = missionsProgress.filter(
      (m) => m.done && !doneMap[m.mission.id]
    );
    for (const m of newlyCompleted) {
      saveMissionDone(m.mission.id);
      toast(`🎉 Misión completada: ${m.mission.title}`);
    }
  }, [open, missionsProgress]);

  // The dialog always opens on the sections menu; each section keeps its
  // internal state (filters, selection) when navigating back and forth.
  // Adjusting state during render is the recommended alternative to an
  // effect here (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setActiveSection(null);
  }

  const completedMissions = missionsProgress.filter((m) => m.done).length;

  const gamesViewedCount = useMemo(() => {
    // Same refresh trigger as missionsProgress: viewed games live in
    // localStorage, outside zustand's reactive store.
    void open;
    void missionsRefreshKey;
    const viewed = loadGamesViewed();
    return VALID_GAMES.filter((g) => viewed[g.id]).length;
  }, [open, missionsRefreshKey]);

  const openSection = (id: SectionId) => {
    if (id === "misiones") setMissionsRefreshKey((k) => k + 1);
    setActiveSection(id);
  };

  const goToMenu = () => {
    setMissionsRefreshKey((k) => k + 1);
    setActiveSection(null);
  };

  const sectionBadges: Record<SectionId, string> = {
    reglas: `Leídas ${readRulesCount}/${RULES.length}`,
    misiones: `${completedMissions}/${MISSIONS.length}`,
    principios: `Leídas ${readCount}/${PRINCIPLES.length}`,
    aperturas: `Vistas ${viewedCount}/${VALID_OPENINGS.length}`,
    trampas: `${understoodCount}/${VALID_TRAPS.length}`,
    finales: `${completedCount}/${VALID_ENDGAMES.length}`,
    partidas: `${gamesViewedCount}/${VALID_GAMES.length}`,
  };

  const activeMeta = SECTIONS.find((s) => s.id === activeSection);
  const ActiveIcon = activeMeta?.icon;

  const isOpeningViewed = !!viewedOpenings[opening.id];
  const isTrapUnderstood = understoodTraps.includes(trap.id);
  const isEndgameCompleted = completedEndgames.includes(endgame.id);

  const openingStateAtPly = useCallback(
    (ply: number) => {
      const o =
        VALID_OPENINGS.find((x) => x.id === openingId) ?? VALID_OPENINGS[0];
      return buildOpeningState(o, ply);
    },
    [openingId]
  );
  const trapStateAtPly = useCallback(
    (ply: number) => {
      const t = VALID_TRAPS.find((x) => x.id === trapId) ?? VALID_TRAPS[0];
      return buildOpeningState(t, ply);
    },
    [trapId]
  );
  const endgameStateAtPly = useCallback(
    (ply: number) => {
      const l =
        VALID_ENDGAMES.find((x) => x.id === endgameId) ?? VALID_ENDGAMES[0];
      return buildEndgameState(l, ply);
    },
    [endgameId]
  );
  const gameStateAtPly = useCallback(
    (ply: number) => {
      const g = VALID_GAMES.find((x) => x.id === gameId) ?? VALID_GAMES[0];
      return buildOpeningState(g, ply);
    },
    [gameId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden max-h-[94vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-accent-plum/10 to-accent-plum/5">
          <DialogTitle className="flex items-center gap-2 text-base font-display">
            <GraduationCap className="h-4 w-4 text-accent-plum dark:text-accent-plum-soft" />
            Aprender
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {activeSection === null ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold font-display">
                  ¿Qué quieres aprender?
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                  Reglas {readRulesCount}/{RULES.length} · Aperturas{" "}
                  {viewedCount}/{VALID_OPENINGS.length} · Misiones{" "}
                  {completedMissions}/{MISSIONS.length}
                </p>
              </div>

              <div className="space-y-1.5">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => openSection(section.id)}
                      className="w-full flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-colors hover:border-accent-gold/50 hover:bg-accent-gold/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-accent-plum dark:text-accent-plum-soft">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">
                          {section.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {section.description}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {sectionBadges[section.id]}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToMenu}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-accent-gold/50 hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Todas las secciones
                </button>
                {activeMeta && ActiveIcon && (
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold font-display">
                    <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-accent-plum dark:text-accent-plum-soft" />
                    <span className="truncate">{activeMeta.title}</span>
                  </span>
                )}
              </div>

              <Tabs value={activeSection} className="gap-3">
            <TabsContent value="reglas" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Todo lo básico para empezar a jugar hoy</span>
                <span>
                  Leídas {readRulesCount}/{RULES.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {RULES.map((rule) => {
                  const isRead = readRules.includes(rule.id);
                  const isOpen = expandedRuleId === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "rounded-lg border overflow-hidden",
                        isRead ? "border-accent-green/30" : "border-border"
                      )}
                    >
                      <button
                        onClick={() =>
                          setExpandedRuleId(isOpen ? null : rule.id)
                        }
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
                      >
                        {rule.piece ? (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/70 text-[16px]"
                            aria-hidden="true"
                          >
                            <ChessPiece type={rule.piece} color="b" />
                          </span>
                        ) : (
                          <span className="text-sm">{rule.emoji}</span>
                        )}
                        <span className="flex-1 text-xs font-semibold">
                          {rule.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {RULE_GROUP_LABELS[rule.group]}
                        </span>
                        {isRead && (
                          <Check className="h-3 w-3 shrink-0 text-accent-green dark:text-accent-green-soft" />
                        )}
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t border-border/50 px-3 pt-2 pb-3">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {rule.summary}
                          </p>
                          {rule.diagram && (
                            <MiniBoard
                              placement={rule.diagram.placement}
                              marks={rule.diagram.marks}
                              caption={rule.diagram.caption}
                            />
                          )}
                          <ul className="space-y-1">
                            {rule.points.map((point, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                              >
                                <span className="mt-0.5 text-[9px] text-accent-gold dark:text-accent-gold-soft">
                                  ◆
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 text-[11px]",
                              isRead &&
                                "border-accent-green/40 text-accent-green dark:text-accent-green-soft"
                            )}
                            onClick={() => toggleRuleRead(rule.id)}
                          >
                            {isRead ? "Quitar de leídas" : "Marcar como leída"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="misiones" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Rutas guiadas de aprendizaje</span>
                <span>
                  Completadas {completedMissions}/{MISSIONS.length}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent-green transition-all"
                  style={{
                    width: `${
                      MISSIONS.length > 0
                        ? Math.round(
                            (completedMissions / MISSIONS.length) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="max-h-[52vh] overflow-y-auto space-y-2 pr-1">
                {missionsProgress.map(
                  ({ mission, objectives, done, doneCount, total }) => {
                    const pct =
                      total > 0 ? Math.round((doneCount / total) * 100) : 0;
                    return (
                      <div
                        key={mission.id}
                        className={cn(
                          "rounded-lg border p-2.5 space-y-2",
                          done
                            ? "border-accent-green/40 bg-accent-green/5"
                            : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm" aria-hidden="true">
                            {mission.emoji}
                          </span>
                          <span className="flex-1 truncate text-xs font-semibold font-display">
                            {mission.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {LEVEL_LABELS[mission.level]}
                          </span>
                          {done && (
                            <span className="shrink-0 text-[9px] font-semibold text-accent-green dark:text-accent-green-soft">
                              ✓ Completada
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {mission.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                done ? "bg-accent-green" : "bg-accent-gold"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                            {doneCount}/{total}
                          </span>
                        </div>

                        <ul className="space-y-1">
                          {objectives.map(
                            ({ objective, current, done: objectiveDone }) => (
                              <li
                                key={`${mission.id}-${objective.kind}-${objective.label}`}
                                className="flex items-center gap-1.5 text-[10px]"
                              >
                                <span
                                  className={cn(
                                    "shrink-0",
                                    objectiveDone
                                      ? "text-accent-green dark:text-accent-green-soft"
                                      : "text-muted-foreground"
                                  )}
                                  aria-hidden="true"
                                >
                                  {objectiveDone ? "✓" : "○"}
                                </span>
                                <span
                                  className={cn(
                                    "flex-1 truncate",
                                    objectiveDone
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {objective.label}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 tabular-nums",
                                    objectiveDone
                                      ? "font-medium text-accent-green dark:text-accent-green-soft"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {Math.min(current, objective.target)}/
                                  {objective.target}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    );
                  }
                )}
              </div>
            </TabsContent>

            <TabsContent value="aperturas" className="space-y-3">
              <Input
                placeholder="Buscar por nombre, ECO o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />

              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {(
                    Object.keys(OPENING_CATEGORY_LABELS) as OpeningCategory[]
                  ).map((cat) => (
                    <FilterChip
                      key={cat}
                      active={categoryFilter === cat}
                      onClick={() =>
                        setCategoryFilter((v) => (v === cat ? null : cat))
                      }
                    >
                      {OPENING_CATEGORY_LABELS[cat]}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(LEVEL_LABELS) as LearningLevel[]).map((lv) => (
                    <FilterChip
                      key={lv}
                      active={levelFilter === lv}
                      onClick={() =>
                        setLevelFilter((v) => (v === lv ? null : lv))
                      }
                    >
                      {LEVEL_LABELS[lv]}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground">
                {filteredOpenings.length} de {VALID_OPENINGS.length} ·{" "}
                {viewedCount} vistas
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredOpenings.map((o) => {
                  const isViewed = !!viewedOpenings[o.id];
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOpeningId(o.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all",
                        opening.id === o.id
                          ? "border-accent-plum bg-accent-plum/10"
                          : "border-border bg-card hover:border-border/80"
                      )}
                    >
                      <span className="flex-1 truncate font-medium">
                        {o.name}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {o.eco}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {LEVEL_LABELS[o.level]}
                      </span>
                      {isViewed && (
                        <Check className="h-3 w-3 shrink-0 text-accent-green dark:text-accent-green-soft" />
                      )}
                    </button>
                  );
                })}
                {filteredOpenings.length === 0 && (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">
                    Sin resultados con esos filtros.
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                {opening.description}
              </div>

              <ul className="space-y-1">
                {opening.ideas.map((idea, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                  >
                    <span className="mt-0.5 text-[9px] text-accent-gold dark:text-accent-gold-soft">
                      ◆
                    </span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>

              <LinePlayer
                lineId={opening.id}
                moves={opening.moves}
                getStateAtPly={openingStateAtPly}
                allowInteractive
                onFirstComplete={() => markOpeningViewed(opening.id)}
                finishMessage={`¡Línea completa! Has repasado ${opening.name}.`}
                accent="plum"
              />

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full h-8 text-[11px]",
                  isOpeningViewed &&
                    "border-accent-green/40 text-accent-green dark:text-accent-green-soft"
                )}
                onClick={() =>
                  isOpeningViewed
                    ? unmarkOpeningViewed(opening.id)
                    : markOpeningViewed(opening.id)
                }
              >
                {isOpeningViewed && <Check className="mr-1.5 size-3.5" />}
                {isOpeningViewed ? "Vista · quitar marca" : "Marcar vista"}
              </Button>
            </TabsContent>

            <TabsContent value="principios" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Ideas esenciales para jugar mejor</span>
                <span>
                  Leídas {readCount}/{PRINCIPLES.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {PRINCIPLES.map((p) => {
                  const isRead = readPrinciples.includes(p.id);
                  const isOpen = expandedPrincipleId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-lg border overflow-hidden",
                        isRead ? "border-accent-green/30" : "border-border"
                      )}
                    >
                      <button
                        onClick={() =>
                          setExpandedPrincipleId(isOpen ? null : p.id)
                        }
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
                      >
                        <span className="text-sm">{p.emoji}</span>
                        <span className="flex-1 text-xs font-semibold">
                          {p.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {PRINCIPLE_CATEGORY_LABELS[p.category]}
                        </span>
                        {isRead && (
                          <Check className="h-3 w-3 shrink-0 text-accent-green dark:text-accent-green-soft" />
                        )}
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t border-border/50 px-3 pt-2 pb-3">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {p.summary}
                          </p>
                          <ul className="space-y-1">
                            {p.points.map((point, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                              >
                                <span className="mt-0.5 text-[9px] text-accent-gold dark:text-accent-gold-soft">
                                  ◆
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="rounded-md border border-accent-wine/30 bg-accent-wine/10 px-2.5 py-1.5 text-[11px] text-accent-wine dark:text-accent-wine-soft leading-relaxed">
                            <strong>Error común:</strong> {p.mistake}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 text-[11px]",
                              isRead &&
                                "border-accent-green/40 text-accent-green dark:text-accent-green-soft"
                            )}
                            onClick={() => togglePrincipleRead(p.id)}
                          >
                            {isRead
                              ? "Quitar de leídas"
                              : "Marcar como leída"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="trampas" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Celadas clásicas: aprende a tenderlas y a evitarlas</span>
                <span>
                  Entendidas {understoodCount}/{VALID_TRAPS.length}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {VALID_TRAPS.map((t) => {
                  const isUnderstood = understoodTraps.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTrapId(t.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all",
                        trap.id === t.id
                          ? "border-accent-wine bg-accent-wine/10"
                          : "border-border bg-card hover:border-border/80"
                      )}
                    >
                      <span className="flex-1 truncate font-medium">
                        {t.name}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {t.eco}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {LEVEL_LABELS[t.level]}
                      </span>
                      {isUnderstood && (
                        <Check className="h-3 w-3 shrink-0 text-accent-green dark:text-accent-green-soft" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-accent-wine/15 px-2 py-0.5 text-[10px] font-medium text-accent-wine dark:text-accent-wine-soft">
                  Víctima: {trap.victim}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Jugada clave: {trap.keyPly}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {trap.description}
              </p>

              <LinePlayer
                lineId={trap.id}
                moves={trap.moves}
                getStateAtPly={trapStateAtPly}
                highlightPly={trap.keyPly}
                finishMessage={`Trampa completada: ${trap.name}.`}
                accent="wine"
              />

              <div className="rounded-lg border border-accent-wine/30 bg-accent-wine/10 px-3 py-2 text-[11px] text-accent-wine dark:text-accent-wine-soft leading-relaxed">
                <strong>Resultado:</strong> {trap.result}
              </div>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full h-8 text-[11px]",
                  isTrapUnderstood &&
                    "border-accent-green/40 text-accent-green dark:text-accent-green-soft"
                )}
                onClick={() => toggleTrapUnderstood(trap.id)}
              >
                {isTrapUnderstood && <Check className="mr-1.5 size-3.5" />}
                {isTrapUnderstood
                  ? "Entendida · quitar marca"
                  : "Marcar como entendida"}
              </Button>
            </TabsContent>

            <TabsContent value="finales" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Técnicas esenciales de final</span>
                <span>
                  Completados {completedCount}/{VALID_ENDGAMES.length}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {VALID_ENDGAMES.map((l) => {
                  const isDone = completedEndgames.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => setEndgameId(l.id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all",
                        endgame.id === l.id
                          ? "border-accent-green bg-accent-green/10"
                          : "border-border bg-card hover:border-border/80"
                      )}
                    >
                      <span className="flex-1 truncate font-medium">
                        {l.title}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {GOAL_LABELS[l.goal]}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {LEVEL_LABELS[l.level]}
                      </span>
                      {isDone && (
                        <Check className="h-3 w-3 shrink-0 text-accent-green dark:text-accent-green-soft" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 text-[11px] text-accent-gold dark:text-accent-gold-soft leading-relaxed">
                {endgame.startNote}
              </div>

              <LinePlayer
                lineId={endgame.id}
                moves={endgame.script}
                getStateAtPly={endgameStateAtPly}
                finishMessage={`¡Lección completada: ${endgame.title}!`}
                accent="green"
              />

              <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-[11px] text-accent-green dark:text-accent-green-soft leading-relaxed">
                <strong>Clave:</strong> {endgame.finalNote}
              </div>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full h-8 text-[11px]",
                  isEndgameCompleted &&
                    "border-accent-green/40 text-accent-green dark:text-accent-green-soft"
                )}
                onClick={() => toggleEndgameCompleted(endgame.id)}
              >
                {isEndgameCompleted && <Check className="mr-1.5 size-3.5" />}
                {isEndgameCompleted
                  ? "Completada · quitar marca"
                  : "Marcar como completada"}
              </Button>
            </TabsContent>
            <TabsContent value="partidas" className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Partidas famosas de la historia</span>
                <span>
                  {filteredGames.length} de {VALID_GAMES.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                <FilterChip
                  active={gameLevelFilter === null}
                  onClick={() => setGameLevelFilter(null)}
                >
                  Todos
                </FilterChip>
                {(Object.keys(LEVEL_LABELS) as LearningLevel[]).map((lv) => (
                  <FilterChip
                    key={lv}
                    active={gameLevelFilter === lv}
                    onClick={() =>
                      setGameLevelFilter((v) => (v === lv ? null : lv))
                    }
                  >
                    {LEVEL_LABELS[lv]}
                  </FilterChip>
                ))}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredGames.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGameId(g.id)}
                    className={cn(
                      "w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all",
                      game.id === g.id
                        ? "border-accent-green bg-accent-green/10"
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex-1 truncate font-medium">
                        {g.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {LEVEL_LABELS[g.level]}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="flex-1 truncate text-[9px] text-muted-foreground">
                        {g.white} vs {g.black}, {g.year}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                          RESULT_STYLES[g.result]
                        )}
                      >
                        {g.result}
                      </span>
                    </span>
                  </button>
                ))}
                {filteredGames.length === 0 && (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">
                    Sin resultados con esos filtros.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-accent-green/15 px-2 py-0.5 text-[10px] font-medium text-accent-green dark:text-accent-green-soft">
                  {game.tag}
                </span>
                <span className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {game.white} vs {game.black}, {game.year} · {game.event}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                {game.description}
              </div>

              <ul className="space-y-1">
                {game.ideas.map((idea, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                  >
                    <span className="mt-0.5 text-[9px] text-accent-gold dark:text-accent-gold-soft">
                      ◆
                    </span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>

              <LinePlayer
                lineId={game.id}
                moves={game.moves}
                getStateAtPly={gameStateAtPly}
                allowInteractive={false}
                onFirstComplete={() => markGameViewed(game.id)}
                finishMessage={`¡Partida completa! Así terminó ${game.name}.`}
                accent="green"
              />
            </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
