"use client";

import { useState, useEffect } from "react";
import { useChessGame } from "@/hooks/useChessGame";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PlayerBar } from "@/components/chess/PlayerBar";
import { GameControls } from "@/components/chess/GameControls";
import { MoveHistory } from "@/components/chess/MoveHistory";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { GameOverDialog } from "@/components/chess/GameOverDialog";
import { GameSetup } from "@/components/chess/GameSetup";
import { SettingsDialog } from "@/components/chess/SettingsDialog";
import { GameMode, PieceColor } from "@/lib/chess/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  History,
  Sun,
  Moon,
  Settings2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ChessLogo } from "@/components/chess/ChessLogo";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [blindfold, setBlindfold] = useState(false);

  const newGame = useChessGame((s) => s.newGame);
  const mode = useChessGame((s) => s.mode);
  const flipped = useChessGame((s) => s.flipped);
  const history = useChessGame((s) => s.history);

  // Check for a saved game on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("chess:game:v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed?.state?.board && parsed?.mode) setHasResume(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleStart = (m: GameMode, bf: boolean) => {
    newGame(m);
    setBlindfold(bf);
    setGameStarted(true);
    setHasResume(false);
  };

  const handleImportPgn = (_pgn: string) => {
    setGameStarted(true);
    setBlindfold(false);
    setHasResume(false);
  };

  const handleResume = () => {
    const ok = useChessGame.getState().loadSaved();
    if (ok) {
      setGameStarted(true);
      setHasResume(false);
      toast.success("Partida restaurada");
    } else {
      setHasResume(false);
      toast.error("No se pudo restaurar la partida");
    }
  };

  const handleNewGame = () => {
    setGameStarted(false);
    setBlindfold(false);
    useChessGame.getState().clearSelection();
    setHasResume(false);
  };

  const handleRematch = () => {
    newGame(mode);
  };

  // Determine top/bottom player labels based on mode and orientation
  const topColor: PieceColor = flipped ? "w" : "b";
  const bottomColor: PieceColor = flipped ? "b" : "w";

  const getLabel = (color: PieceColor) => {
    if (mode.type === "ai") {
      return color === mode.playerColor ? "Tú" : "Máquina";
    }
    return color === "w" ? "Jugador 1" : "Jugador 2";
  };

  const getIcon = (color: PieceColor): "user" | "bot" | "users" => {
    if (mode.type === "ai") {
      return color === mode.playerColor ? "user" : "bot";
    }
    return "users";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900">
      <Header
        onBack={gameStarted ? handleNewGame : undefined}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-3 pb-4 flex flex-col">
        <AnimatePresence mode="wait">
          {!gameStarted ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center py-6"
            >
              <HeroBanner />
              {hasResume && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 w-full max-w-md"
                >
                  <button
                    onClick={handleResume}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Continuar partida guardada
                  </button>
                </motion.div>
              )}
              <div className="w-full mt-6">
                <GameSetup onStart={handleStart} onImportPgn={handleImportPgn} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3 py-3"
            >
              <PlayerBar
                color={topColor}
                label={getLabel(topColor)}
                icon={getIcon(topColor)}
              />

              <ChessBoard blindfold={blindfold} />

              {blindfold && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium flex items-center justify-center gap-1.5">
                  <span>♟</span> Modo a la ciega activo · toca una pieza para verla
                </div>
              )}

              <PlayerBar
                color={bottomColor}
                label={getLabel(bottomColor)}
                icon={getIcon(bottomColor)}
              />

              <div className="mt-1">
                <GameControls
                  onNewGame={handleNewGame}
                  onOpenSettings={() => setShowSettings(true)}
                />
              </div>

              {/* Move history toggle (mobile) */}
              <div className="lg:hidden">
                <Sheet open={showHistory} onOpenChange={setShowHistory}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full h-10">
                      <History className="h-4 w-4 mr-2" />
                      Ver historial
                      {history.length > 0 && (
                        <span className="ml-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                          {Math.ceil(history.length / 2)}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh] p-0">
                    <SheetHeader className="px-4 pt-4 pb-2 border-b">
                      <SheetTitle className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historial de jugadas
                      </SheetTitle>
                    </SheetHeader>
                    <div className="h-full pb-4">
                      <MoveHistory />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Move history (desktop) */}
              <div className="hidden lg:block rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                <MoveHistory />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <PromotionDialog />
      <GameOverDialog onNewGame={handleNewGame} onRematch={handleRematch} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

function Header({
  onBack,
  onOpenSettings,
}: {
  onBack?: () => void;
  onOpenSettings: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="max-w-2xl mx-auto px-3 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <ChessLogo className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold leading-tight">Ajedrez Móvil</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Gratis · vs Máquina & Offline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Cambiar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}
          {!onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onOpenSettings}
              title="Ajustes"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroBanner() {
  return (
    <div className="text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl mb-3"
      >
        <ChessLogo className="h-9 w-9" />
      </motion.div>
      <h2 className="text-2xl font-bold tracking-tight">
        Ajedrez <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
        Juega contra la máquina con IA o reta a un amigo en modo multijugador
        offline, directamente en tu móvil.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/60">
      <div className="max-w-2xl mx-auto px-3 py-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span> ♟ Ajedrez Móvil — Hecho con Next.js</span>
      </div>
    </footer>
  );
}

