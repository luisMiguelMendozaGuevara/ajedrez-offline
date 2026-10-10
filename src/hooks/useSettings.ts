"use client";

import { create } from "zustand";
import {
  AppSettings,
  BoardThemeId,
  PieceStyleId,
  loadSettings,
  saveSettings,
  BOARD_THEMES,
} from "@/lib/chess/storage";

interface SettingsStore extends AppSettings {
  setBoardTheme: (theme: BoardThemeId) => void;
  setPieceStyle: (style: PieceStyleId) => void;
  toggleCoordinates: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleHighlightLastMove: () => void;
  hydrate: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...loadSettingsSafe(),

  setBoardTheme: (theme) => {
    set({ boardTheme: theme });
    persist(get());
  },
  setPieceStyle: (style) => {
    set({ pieceStyle: style });
    persist(get());
  },
  toggleCoordinates: () => {
    set({ showCoordinates: !get().showCoordinates });
    persist(get());
  },
  toggleSound: () => {
    set({ soundEnabled: !get().soundEnabled });
    persist(get());
  },
  toggleHaptics: () => {
    set({ hapticsEnabled: !get().hapticsEnabled });
    persist(get());
  },
  toggleHighlightLastMove: () => {
    set({ highlightLastMove: !get().highlightLastMove });
    persist(get());
  },
  hydrate: () => {
    set(loadSettingsSafe());
  },
}));

function loadSettingsSafe(): AppSettings {
  if (typeof window === "undefined") {
    return {
      boardTheme: "classic",
      pieceStyle: "classic",
      showCoordinates: true,
      soundEnabled: true,
      hapticsEnabled: true,
      highlightLastMove: true,
    };
  }
  return loadSettings();
}

function persist(s: AppSettings): void {
  if (typeof window === "undefined") return;
  saveSettings(s);
}

export function getBoardTheme(themeId: BoardThemeId) {
  return BOARD_THEMES[themeId] ?? BOARD_THEMES.classic;
}
