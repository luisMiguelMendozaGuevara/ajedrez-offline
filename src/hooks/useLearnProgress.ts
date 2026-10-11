"use client";

import { create } from "zustand";
import {
  LearnProgress,
  loadLearnProgress,
  saveLearnProgress,
  resetLearnProgress,
} from "@/lib/chess/storage";

interface LearnStore extends LearnProgress {
  markOpeningViewed: (id: string) => void;
  unmarkOpeningViewed: (id: string) => void;
  toggleTrapUnderstood: (id: string) => void;
  toggleEndgameCompleted: (id: string) => void;
  togglePrincipleRead: (id: string) => void;
  toggleRuleRead: (id: string) => void;
  resetProgress: () => void;
  hydrate: () => void;
}

export const useLearnProgress = create<LearnStore>((set, get) => ({
  ...loadLearnProgressSafe(),

  markOpeningViewed: (id) => {
    set({ viewedOpenings: { ...get().viewedOpenings, [id]: Date.now() } });
    persist(get());
  },
  unmarkOpeningViewed: (id) => {
    const viewedOpenings = { ...get().viewedOpenings };
    delete viewedOpenings[id];
    set({ viewedOpenings });
    persist(get());
  },
  toggleTrapUnderstood: (id) => {
    set({ understoodTraps: toggleIn(get().understoodTraps, id) });
    persist(get());
  },
  toggleEndgameCompleted: (id) => {
    set({ completedEndgames: toggleIn(get().completedEndgames, id) });
    persist(get());
  },
  togglePrincipleRead: (id) => {
    set({ readPrinciples: toggleIn(get().readPrinciples, id) });
    persist(get());
  },
  toggleRuleRead: (id) => {
    set({ readRules: toggleIn(get().readRules, id) });
    persist(get());
  },
  resetProgress: () => {
    set(resetLearnProgress());
  },
  hydrate: () => {
    set(loadLearnProgressSafe());
  },
}));

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function loadLearnProgressSafe(): LearnProgress {
  if (typeof window === "undefined") {
    return {
      viewedOpenings: {},
      understoodTraps: [],
      completedEndgames: [],
      readPrinciples: [],
      readRules: [],
    };
  }
  return loadLearnProgress();
}

function persist(s: LearnProgress): void {
  if (typeof window === "undefined") return;
  saveLearnProgress({
    viewedOpenings: s.viewedOpenings,
    understoodTraps: s.understoodTraps,
    completedEndgames: s.completedEndgames,
    readPrinciples: s.readPrinciples,
    readRules: s.readRules,
  });
}
