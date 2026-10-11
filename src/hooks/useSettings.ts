"use client";

import { create } from "zustand";
import {
  AppSettings,
  BoardThemeId,
  BoardViewId,
  PieceSetId,
  PieceStyleId,
  UiAccentId,
  loadSettings,
  saveSettings,
  BOARD_THEMES,
} from "@/lib/chess/storage";
import { MusicTrackId, applyMusicSettings } from "@/lib/chess/music";

interface SettingsStore extends AppSettings {
  setBoardTheme: (theme: BoardThemeId) => void;
  setPieceSet: (set: PieceSetId) => void;
  setPieceStyle: (style: PieceStyleId) => void;
  setUiAccent: (accent: UiAccentId) => void;
  setBoardView: (view: BoardViewId) => void;
  toggleCoordinates: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleHighlightLastMove: () => void;
  toggleAutoFlipMultiplayer: () => void;
  toggleMusic: () => void;
  setMusicTrack: (track: MusicTrackId) => void;
  hydrate: () => void;
}

export function applyUiAccent(accent: UiAccentId): void {
  if (typeof document === "undefined") return;
  if (accent === "verde") {
    document.documentElement.removeAttribute("data-ui");
  } else {
    document.documentElement.setAttribute("data-ui", accent);
  }
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
  setUiAccent: (uiAccent) => {
    set({ uiAccent });
    persist(get());
    applyUiAccent(uiAccent);
  },
  setBoardView: (boardView) => {
    set({ boardView });
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
  toggleAutoFlipMultiplayer: () => {
    set({ autoFlipMultiplayer: !get().autoFlipMultiplayer });
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
      uiAccent: "verde",
      boardView: "flat",
      showCoordinates: true,
      soundEnabled: true,
      hapticsEnabled: true,
      highlightLastMove: true,
      autoFlipMultiplayer: false,
      musicEnabled: true,
      musicTrack: "vintage",
    };
  }
  return loadSettings();
}

// Apply the saved interface color as early as possible on the client.
if (typeof window !== "undefined") {
  applyUiAccent(loadSettingsSafe().uiAccent);
}

function persist(s: AppSettings): void {
  if (typeof window === "undefined") return;
  saveSettings(s);
}

export function getBoardTheme(themeId: BoardThemeId) {
  return BOARD_THEMES[themeId] ?? BOARD_THEMES.classic;
}
