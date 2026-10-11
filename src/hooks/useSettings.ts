"use client";

import { create } from "zustand";
import {
  AppSettings,
  BoardThemeId,
  PieceSetId,
  PieceStyleId,
  loadSettings,
  saveSettings,
  BOARD_THEMES,
} from "@/lib/chess/storage";
import { MusicTrackId, applyMusicSettings } from "@/lib/chess/music";

interface SettingsStore extends AppSettings {
  setBoardTheme: (theme: BoardThemeId) => void;
  setPieceSet: (set: PieceSetId) => void;
  setPieceStyle: (style: PieceStyleId) => void;
  toggleCoordinates: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleHighlightLastMove: () => void;
  toggleMusic: () => void;
  setMusicTrack: (track: MusicTrackId) => void;
  hydrate: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...loadSettingsSafe(),

  setBoardTheme: (theme) => {
    set({ boardTheme: theme });
    persist(get());
  },
  setPieceSet: (pieceSet) => {
    set({ pieceSet });
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
  toggleMusic: () => {
    const musicEnabled = !get().musicEnabled;
    set({ musicEnabled });
    persist(get());
    applyMusicSettings({ musicEnabled, musicTrack: get().musicTrack });
  },
  setMusicTrack: (musicTrack) => {
    set({ musicTrack });
    persist(get());
    applyMusicSettings({ musicEnabled: get().musicEnabled, musicTrack });
  },
  hydrate: () => {
    set(loadSettingsSafe());
  },
}));

function loadSettingsSafe(): AppSettings {
  if (typeof window === "undefined") {
    return {
      boardTheme: "classic",
      pieceSet: "merida",
      pieceStyle: "staunton",
      showCoordinates: true,
      soundEnabled: true,
      hapticsEnabled: true,
      highlightLastMove: true,
      musicEnabled: true,
      musicTrack: "vintage",
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
