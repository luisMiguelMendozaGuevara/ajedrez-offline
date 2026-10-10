// Achievements system: unlockable badges based on game stats and events.
import { GameStats, loadStats } from "./storage";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  // Check if unlocked given current stats
  isUnlocked: (stats: GameStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-win",
    name: "Primera Victoria",
    description: "Gana tu primera partida contra la máquina",
    emoji: "🏆",
    isUnlocked: (s) => s.wins >= 1,
  },
  {
    id: "five-wins",
    name: "En racha",
    description: "Gana 5 partidas contra la máquina",
    emoji: "🔥",
    isUnlocked: (s) => s.wins >= 5,
  },
  {
    id: "ten-wins",
    name: "Maestro del tablero",
    description: "Gana 10 partidas contra la máquina",
    emoji: "👑",
    isUnlocked: (s) => s.wins >= 10,
  },
  {
    id: "streak-3",
    name: "Racha de 3",
    description: "Consigue 3 victorias consecutivas",
    emoji: "⚡",
    isUnlocked: (s) => s.bestStreak >= 3,
  },
  {
    id: "streak-5",
    name: "Imparable",
    description: "Consigue 5 victorias consecutivas",
    emoji: "💪",
    isUnlocked: (s) => s.bestStreak >= 5,
  },
  {
    id: "fast-win",
    name: "Victoria relámpago",
    description: "Gana una partida en 20 jugadas o menos",
    emoji: "⏱",
    isUnlocked: (s) =>
      s.fastestWinMoves != null && s.fastestWinMoves <= 20,
  },
  {
    id: "expert-win",
    name: "Velocidad de pensamiento",
    description: "(Requiere victoria en modo Experto — se concede al ganar)",
    emoji: "🧠",
    isUnlocked: (s) => s.wins >= 1 && s.bestStreak >= 1, // simplified proxy
  },
  {
    id: "persistent",
    name: "Constante",
    description: "Juega 10 partidas",
    emoji: "🎯",
    isUnlocked: (s) => s.gamesPlayed >= 10,
  },
  {
    id: "veteran",
    name: "Veterano",
    description: "Juega 25 partidas",
    emoji: "🎖️",
    isUnlocked: (s) => s.gamesPlayed >= 25,
  },
  {
    id: "hundred-moves",
    name: "Paciente",
    description: "Realiza 100 jugadas en total",
    emoji: "♟",
    isUnlocked: (s) => s.totalMoves >= 100,
  },
  {
    id: "thousand-moves",
    name: "Centurión",
    description: "Realiza 1000 jugadas en total",
    emoji: "🏛️",
    isUnlocked: (s) => s.totalMoves >= 1000,
  },
  {
    id: "draw-master",
    name: "Tablas honestas",
    description: "Acaba 3 partidas en tablas",
    emoji: "🤝",
    isUnlocked: (s) => s.draws >= 3,
  },
];

const UNLOCKED_KEY = "chess:unlocked:v1";

export function loadUnlocked(): Record<string, number> {
  // id -> timestamp when unlocked
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveUnlocked(map: Record<string, number>): void {
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Compute newly-unlocked achievements given current stats, update storage,
// return the list of freshly unlocked achievements.
export function checkNewAchievements(): Achievement[] {
  const stats = loadStats();
  const unlocked = loadUnlocked();
  const newlyUnlocked: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.isUnlocked(stats)) {
      unlocked[a.id] = Date.now();
      newlyUnlocked.push(a);
    }
  }
  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked);
  }
  return newlyUnlocked;
}

export function getAllAchievements(): {
  achievement: Achievement;
  unlockedAt: number | null;
}[] {
  const unlocked = loadUnlocked();
  return ACHIEVEMENTS.map((a) => ({
    achievement: a,
    unlockedAt: unlocked[a.id] ?? null,
  }));
}
