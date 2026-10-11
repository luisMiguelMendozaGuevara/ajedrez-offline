// Learning missions: guided routes with objectives and progress.
// Objectives are derived from progress already stored elsewhere
// (learn progress, solved puzzles, game stats) plus the "games viewed"
// map kept here for the famous-games objectives.

import { loadLearnProgress, loadStats } from "./storage";
import { VALID_PUZZLES } from "./puzzles";
import { VALID_GAMES } from "./games";

export type MissionLevel = "principiante" | "intermedio" | "avanzado";

export type MissionObjectiveKind =
  | "rules"
  | "principles"
  | "openings"
  | "traps"
  | "endgames"
  | "games"
  | "puzzlesM1"
  | "puzzlesM2"
  | "puzzlesM3"
  | "puzzlesThemeFinal"
  | "puzzlesTotal"
  | "winEasy"
  | "winMedium"
  | "winHard";

export interface MissionObjective {
  kind: MissionObjectiveKind;
  target: number;
  label: string;
}

export interface Mission {
  id: string;
  title: string;
  emoji: string;
  level: MissionLevel;
  description: string;
  objectives: MissionObjective[];
}

export const MISSIONS: Mission[] = [
  {
    id: "first-steps",
    title: "Primeros pasos",
    emoji: "🌱",
    level: "principiante",
    description: "Aprende cómo funciona el ajedrez y da tus primeros mates.",
    objectives: [
      { kind: "rules", target: 5, label: "Leer 5 reglas" },
      { kind: "puzzlesM1", target: 3, label: "Resolver 3 puzzles M1" },
    ],
  },
  {
    id: "openings-basics",
    title: "Tus primeras aperturas",
    emoji: "📖",
    level: "principiante",
    description: "Aprende a empezar bien cualquier partida.",
    objectives: [
      { kind: "openings", target: 3, label: "Ver 3 aperturas" },
      { kind: "principles", target: 3, label: "Leer 3 principios" },
    ],
  },
  {
    id: "tactics-basic",
    title: "Táctica básica",
    emoji: "⚔️",
    level: "principiante",
    description: "Reconoce golpes y celadas simples.",
    objectives: [
      { kind: "puzzlesM1", target: 8, label: "Resolver 8 puzzles M1" },
      { kind: "traps", target: 2, label: "Entender 2 trampas" },
    ],
  },
  {
    id: "mate-hunter",
    title: "Cazador de mates",
    emoji: "🎯",
    level: "intermedio",
    description: "Domina los mates en 2.",
    objectives: [
      { kind: "puzzlesM2", target: 8, label: "Resolver 8 puzzles M2" },
      { kind: "games", target: 1, label: "Ver 1 partida famosa" },
    ],
  },
  {
    id: "endgames",
    title: "Finales esenciales",
    emoji: "👑",
    level: "intermedio",
    description: "Remata cuando quedan pocas piezas.",
    objectives: [
      { kind: "endgames", target: 3, label: "Completar 3 finales" },
      {
        kind: "puzzlesThemeFinal",
        target: 5,
        label: "Resolver 5 puzzles del tema Final",
      },
    ],
  },
  {
    id: "traps-master",
    title: "Maestro de trampas",
    emoji: "🕸️",
    level: "intermedio",
    description: "Tiende celadas y no caigas en ellas.",
    objectives: [
      { kind: "traps", target: 4, label: "Entender 4 trampas" },
      { kind: "puzzlesM3", target: 5, label: "Resolver 5 puzzles M3" },
    ],
  },
  {
    id: "legendary-games",
    title: "Partidas legendarias",
    emoji: "🏛️",
    level: "avanzado",
    description: "Revive las partidas más famosas de la historia.",
    objectives: [
      { kind: "games", target: 4, label: "Ver las 4 partidas" },
      { kind: "principles", target: 6, label: "Leer 6 principios" },
    ],
  },
  {
    id: "beat-machine",
    title: "Vence a la máquina",
    emoji: "🤖",
    level: "avanzado",
    description: "Gana a la IA en niveles crecientes.",
    objectives: [
      { kind: "winEasy", target: 1, label: "Ganar vs Fácil" },
      { kind: "winMedium", target: 1, label: "Ganar vs Medio" },
      { kind: "winHard", target: 1, label: "Ganar vs Difícil" },
    ],
  },
  {
    id: "collector",
    title: "Coleccionista",
    emoji: "🏆",
    level: "avanzado",
    description: "Completa gran parte del contenido.",
    objectives: [
      { kind: "puzzlesTotal", target: 40, label: "Resolver 40 puzzles en total" },
      { kind: "endgames", target: 6, label: "Completar 6 finales" },
      { kind: "rules", target: 14, label: "Leer las 14 reglas" },
    ],
  },
];

export interface ObjectiveProgress {
  objective: MissionObjective;
  current: number;
  done: boolean;
}

export interface MissionProgress {
  mission: Mission;
  objectives: ObjectiveProgress[];
  done: boolean;
  doneCount: number;
  total: number;
}

// Completed missions: { [missionId]: timestamp }
const MISSIONS_KEY = "chess:missions:v1";
// Famous games viewed inside the learn dialog: { [gameId]: timestamp }
const GAMES_VIEWED_KEY = "chess:missions:games:v1";
// Solved puzzles, shared with the daily puzzle dialog.
const SOLVED_PUZZLES_KEY = "chess:puzzle-solved:v1";

function readTimestampMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const clean: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && Number.isFinite(ts)) clean[id] = ts;
    }
    return clean;
  } catch {
    return {};
  }
}

function writeTimestampEntry(key: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = readTimestampMap(key);
    map[id] = Date.now();
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // storage may be unavailable (private mode); ignore
  }
}

export function loadMissionsDone(): Record<string, number> {
  return readTimestampMap(MISSIONS_KEY);
}

export function saveMissionDone(id: string): void {
  writeTimestampEntry(MISSIONS_KEY, id);
}

export function loadGamesViewed(): Record<string, number> {
  return readTimestampMap(GAMES_VIEWED_KEY);
}

export function markGameViewed(id: string): void {
  writeTimestampEntry(GAMES_VIEWED_KEY, id);
}

function loadSolvedPuzzleIds(): Set<string> {
  const solved = readTimestampMap(SOLVED_PUZZLES_KEY);
  const known = new Set(VALID_PUZZLES.map((p) => p.id));
  const ids = new Set<string>();
  for (const id of Object.keys(solved)) {
    if (known.has(id)) ids.add(id);
  }
  return ids;
}

export function computeMissionProgress(): MissionProgress[] {
  const learn = loadLearnProgress();
  const stats = loadStats();
  const solved = loadSolvedPuzzleIds();
  const gamesViewed = loadGamesViewed();

  const countPuzzles = (
    predicate: (p: (typeof VALID_PUZZLES)[number]) => boolean
  ): number => VALID_PUZZLES.filter((p) => solved.has(p.id) && predicate(p)).length;

  const counts: Record<MissionObjectiveKind, number> = {
    rules: learn.readRules.length,
    principles: learn.readPrinciples.length,
    openings: Object.keys(learn.viewedOpenings).length,
    traps: learn.understoodTraps.length,
    endgames: learn.completedEndgames.length,
    games: VALID_GAMES.filter((g) => gamesViewed[g.id]).length,
    puzzlesM1: countPuzzles((p) => p.difficulty === "M1"),
    puzzlesM2: countPuzzles((p) => p.difficulty === "M2"),
    puzzlesM3: countPuzzles((p) => p.difficulty === "M3"),
    puzzlesThemeFinal: countPuzzles((p) => p.theme === "final"),
    puzzlesTotal: solved.size,
    winEasy: stats.winsByDifficulty?.easy ?? 0,
    winMedium: stats.winsByDifficulty?.medium ?? 0,
    winHard: stats.winsByDifficulty?.hard ?? 0,
  };

  return MISSIONS.map((mission) => {
    const objectives: ObjectiveProgress[] = mission.objectives.map(
      (objective) => {
        const current = counts[objective.kind] ?? 0;
        return { objective, current, done: current >= objective.target };
      }
    );
    const doneCount = objectives.filter((o) => o.done).length;
    const total = objectives.length;
    return { mission, objectives, done: doneCount === total, doneCount, total };
  });
}
