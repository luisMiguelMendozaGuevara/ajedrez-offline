"use client";

import { useState, useEffect, useRef } from "react";
import { useChessGame } from "@/hooks/useChessGame";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PlayerBar } from "@/components/chess/PlayerBar";
import { GameControls } from "@/components/chess/GameControls";
import { MoveHistory } from "@/components/chess/MoveHistory";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { GameOverDialog } from "@/components/chess/GameOverDialog";
import { GameSetup } from "@/components/chess/GameSetup";
import { SettingsDialog } from "@/components/chess/SettingsDialog";
import { DailyPuzzleDialog } from "@/components/chess/DailyPuzzleDialog";
import { AchievementsDialog } from "@/components/chess/AchievementsDialog";
import { EvalBar } from "@/components/chess/EvalBar";
import { OpeningTutorialDialog } from "@/components/chess/OpeningTutorialDialog";
import { ReviewBar } from "@/components/chess/ReviewBar";
import { PuzzleRushDialog } from "@/components/chess/PuzzleRushDialog";
import { GameMode, PieceColor } from "@/lib/chess/types";
import { checkNewAchievements } from "@/lib/chess/achievements";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Box,
  History,
  Sun,
  Moon,
  Settings2,
  Play,
  Puzzle as PuzzleIcon,
  Award,
  BarChart3,
  GraduationCap,
  Zap,
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
import { playSound } from "@/lib/chess/sound";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showOpenings, setShowOpenings] = useState(false);
  const [showRush, setShowRush] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [blindfold, setBlindfold] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const prevStatusRef = useRef<string>("playing");

  const newGame = useChessGame((s) => s.newGame);
  const mode = useChessGame((s) => s.mode);
  const flipped = useChessGame((s) => s.flipped);
  const history = useChessGame((s) => s.history);
  const status = useChessGame((s) => s.status);
  const reviewMode = useChessGame((s) => s.reviewMode);
  const boardView = useSettings((s) => s.boardView);
  const setBoardView = useSettings((s) => s.setBoardView);

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

  // Detect game end → check for newly unlocked achievements
  useEffect(() => {
    const prev = prevStatusRef.current;
    const finished =
      status === "checkmate" ||
      status === "stalemate" ||
      status === "draw" ||
      status === "resigned";
    if (finished && prev === "playing") {
      // Slight delay so stats are persisted first
      const t = setTimeout(() => {
        // Winner notification (fresh state: winner/mode were just set)
        const { winner, mode: currentMode } = useChessGame.getState();
        if (winner) {
          let msg: string;
          if (currentMode.type === "ai") {
            msg =
              winner === currentMode.playerColor
                ? "¡Victoria! Ganaste la partida"
                : "Gana la máquina — ¡suerte la próxima!";
          } else {
            msg =
              winner === "w"
                ? "¡Gana Jugador 1 (blancas)!"
                : "¡Gana Jugador 2 (negras)!";
          }
          toast.success(msg, {
            description:
              status === "resigned" ? "Victoria por abandono" : "Jaque mate",
          });
        }
        const newly = checkNewAchievements();
        newly.forEach((a, i) => {
          setTimeout(() => {
            toast.success(`🏆 Logro desbloqueado: ${a.name}`, {
              description: a.description,
            });
          }, i * 400);
        });
      }, 300);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = finished ? "finished" : "playing";
    return;
  }, [status]);

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
    <div className="min-h-screen flex flex-col">
      <Header
        onBack={gameStarted ? handleNewGame : undefined}
        onOpenSettings={() => setShowSettings(true)}
        onOpenPuzzle={() => setShowPuzzle(true)}
        onOpenAchievements={() => setShowAchievements(true)}
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
                    onClick={() => {
                      playSound("click", useSettings.getState().soundEnabled);
                      handleResume();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-accent-gold/60 bg-accent-gold/10 hover:bg-accent-gold/20 px-4 py-2.5 text-sm font-semibold text-accent-gold dark:text-accent-gold-soft transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Continuar partida guardada
                  </button>
                </motion.div>
              )}

              {/* Quick-access row: Desafío + Rush + Aprender + Logros */}
              <div className="grid grid-cols-4 gap-1.5 w-full max-w-md mt-4">
                <QuickCard
                  onClick={() => setShowPuzzle(true)}
                  icon={<PuzzleIcon className="h-4 w-4" />}
                  title="Desafío"
                  accent="slate"
                  compact
                />
                <QuickCard
                  onClick={() => setShowRush(true)}
                  icon={<Zap className="h-4 w-4" />}
                  title="Rush"
                  accent="wine"
                  compact
                />
                <QuickCard
                  onClick={() => setShowOpenings(true)}
                  icon={<GraduationCap className="h-4 w-4" />}
                  title="Aprender"
                  accent="plum"
                  compact
                />
                <QuickCard
                  onClick={() => setShowAchievements(true)}
                  icon={<Award className="h-4 w-4" />}
                  title="Logros"
                  accent="gold"
                  compact
                />
              </div>

              <div className="w-full mt-5">
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
              className="flex-1 flex flex-col py-3"
            >
              <div className="my-auto w-full flex flex-col gap-2.5">
                <PlayerBar
                  color={topColor}
                  label={getLabel(topColor)}
                  icon={getIcon(topColor)}
                />

                {/* Evaluation bar (toggleable) */}
                {showEval && (
                  <div className="flex items-center gap-2">
                    <EvalBar />
                    <button
                      onClick={() => setShowEval(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                      title="Ocultar evaluación"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="-mx-3">
                  <ChessBoard blindfold={blindfold} />
                </div>

                {blindfold && (
                  <div className="rounded-lg bg-accent-gold/10 border border-accent-gold/30 px-3 py-1.5 text-[11px] text-accent-gold dark:text-accent-gold-soft text-center font-medium flex items-center justify-center gap-1.5">
                    <span>♟</span> Modo a la ciega activo · toca una pieza
                    para verla
                  </div>
                )}

                <PlayerBar
                  color={bottomColor}
                  label={getLabel(bottomColor)}
                  icon={getIcon(bottomColor)}
                />

                {/* Review bar: siempre visible mientras el repaso está activo */}
                {reviewMode && <ReviewBar />}

                {/* Options toggle (mobile) */}
                <Button
                  variant="outline"
                  className="lg:hidden h-9 text-xs"
                  onClick={() => setShowOptions((v) => !v)}
                >
                  {showOptions ? (
                    <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {showOptions ? "Ocultar opciones" : "Opciones"}
                </Button>

                {/* Options: collapsible on mobile, always visible on desktop */}
                <div
                  className={cn(
                    "flex-col gap-2.5",
                    showOptions ? "flex" : "hidden",
                    "lg:flex"
                  )}
                >
                  <GameControls
                    onNewGame={handleNewGame}
                    onOpenSettings={() => setShowSettings(true)}
                  />

                  {/* Analysis toggle (if not already showing) */}
                  {!showEval && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-[11px] text-muted-foreground"
                      onClick={() => setShowEval(true)}
                    >
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                      Mostrar barra de evaluación
                    </Button>
                  )}

                  {/* Board view toggle (flat / isometric 3D) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-[11px] text-muted-foreground"
                    onClick={() =>
                      setBoardView(boardView === "iso" ? "flat" : "iso")
                    }
                  >
                    <Box className="h-3.5 w-3.5 mr-1.5" />
                    {boardView === "iso"
                      ? "Usar vista clásica"
                      : "Vista isométrica 3D"}
                  </Button>

                  {/* Review bar (repaso de partida) */}
                  {!reviewMode && <ReviewBar />}

                  {/* Move history toggle (mobile) */}
                  <div className="lg:hidden">
                    <Sheet open={showHistory} onOpenChange={setShowHistory}>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full h-10">
                          <History className="h-4 w-4 mr-2" />
                          Ver historial
                          {history.length > 0 && (
                            <span className="ml-2 rounded-full bg-accent-green/15 text-accent-green dark:text-accent-green-soft px-2 py-0.5 text-[10px] font-semibold">
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <PromotionDialog />
      <GameOverDialog onNewGame={handleNewGame} onRematch={handleRematch} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <DailyPuzzleDialog open={showPuzzle} onOpenChange={setShowPuzzle} />
      <AchievementsDialog
        open={showAchievements}
        onOpenChange={setShowAchievements}
      />
      <OpeningTutorialDialog
        open={showOpenings}
        onOpenChange={setShowOpenings}
      />
      <PuzzleRushDialog open={showRush} onOpenChange={setShowRush} />
    </div>
  );
}

function Header({
  onBack,
  onOpenSettings,
  onOpenPuzzle,
  onOpenAchievements,
}: {
  onBack?: () => void;
  onOpenSettings: () => void;
  onOpenPuzzle: () => void;
  onOpenAchievements: () => void;
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#C6A15B] to-[#8C6D3B] text-[#241C16] shadow-md">
              <ChessLogo className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-display font-semibold leading-tight tracking-wide">
              Ajedrez Offline
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Gratis · Sin conexión
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
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={onOpenPuzzle}
                title="Desafío diario"
              >
                <PuzzleIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={onOpenAchievements}
                title="Logros"
              >
                <Award className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={onOpenSettings}
                title="Ajustes"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function QuickCard({
  onClick,
  icon,
  title,
  desc,
  accent,
  compact = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc?: string;
  accent: "slate" | "gold" | "plum" | "wine";
  compact?: boolean;
}) {
  const borderClass =
    accent === "slate"
      ? "border-accent-slate/40 bg-accent-slate/10 hover:bg-accent-slate/20"
      : accent === "gold"
        ? "border-accent-gold/40 bg-accent-gold/10 hover:bg-accent-gold/20"
        : accent === "wine"
          ? "border-accent-wine/40 bg-accent-wine/10 hover:bg-accent-wine/20"
          : "border-accent-plum/40 bg-accent-plum/10 hover:bg-accent-plum/20";
  const gradClass =
    accent === "slate"
      ? "bg-gradient-to-br from-[#5A6E86] to-[#3A4A5E]"
      : accent === "gold"
        ? "bg-gradient-to-br from-[#C6A15B] to-[#8C6D3B]"
        : accent === "wine"
          ? "bg-gradient-to-br from-[#8C3A33] to-[#5E1F1C]"
          : "bg-gradient-to-br from-[#7A5A6E] to-[#4E3846]";
  return (
    <button
      onClick={() => {
        playSound("click", useSettings.getState().soundEnabled);
        onClick();
      }}
      className={
        "relative flex flex-col items-center gap-1.5 rounded-xl border-2 transition-all " +
        (compact ? "p-2.5 " : "flex-row items-center gap-2.5 p-3 ") +
        borderClass
      }
    >
      <div
        className={
          "flex items-center justify-center rounded-lg text-white shadow-sm " +
          (compact ? "h-9 w-9" : "h-9 w-9 ") +
          gradClass
        }
      >
        {icon}
      </div>
      <div className={compact ? "text-center" : "text-left"}>
        <div className={compact ? "text-[11px] font-semibold leading-tight" : "text-sm font-semibold"}>
          {title}
        </div>
        {desc && (
          <div className="text-[10px] text-muted-foreground leading-tight">
            {desc}
          </div>
        )}
      </div>
    </button>
  );
}

function HeroBanner() {
  return (
    <div className="text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#35513F] to-[#22362B] text-[#EFE3CF] shadow-xl ring-1 ring-accent-gold/50 mb-3"
      >
        <ChessLogo className="h-9 w-9" />
      </motion.div>
      <h2 className="text-3xl font-display font-semibold tracking-tight">
        Ajedrez{" "}
        <span className="text-accent-gold dark:text-accent-gold-soft">
          Offline
        </span>
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
        Juega contra la máquina con IA o reta a un amigo en la misma pantalla,
        directamente en tu móvil. Sin conexión.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-card/40">
      <div className="max-w-2xl mx-auto px-3 py-3 flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
        <span>♟ Ajedrez Offline — Hecho con Next.js</span>
        <span className="text-[10px] text-muted-foreground/80 text-center px-4">
          Piezas de ajedrez open source · créditos y licencias en Ajustes →
          Diseño de piezas
        </span>
      </div>
    </footer>
  );
}

