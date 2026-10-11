"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";
import {
  BOARD_THEMES,
  BoardThemeId,
  PIECE_SETS_META,
  PIECE_STYLES,
  PieceSetId,
  PieceStyleId,
  loadStats,
  resetStats,
} from "@/lib/chess/storage";
import { ChessPiece } from "./ChessPiece";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Settings2,
  Palette,
  Volume2,
  VolumeX,
  Vibrate,
  Type,
  Highlighter,
  Trash2,
  Trophy,
  BarChart3,
  Music,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { MusicTrackId } from "@/lib/chess/music";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MUSIC_TRACKS: { id: MusicTrackId; name: string; emoji: string }[] = [
  { id: "vintage", name: "Vintage", emoji: "🎻" },
  { id: "retro", name: "Retro 8-bit", emoji: "🎮" },
  { id: "classical", name: "Clásico", emoji: "🎹" },
  { id: "rock", name: "Rock", emoji: "🎸" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettings();
  const [stats, setStats] = useState(() => loadStats());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setStats(loadStats());
  }, [open]);

  const winRate =
    stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden max-h-[88vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-accent-green/10 to-accent-gold/5">
          <DialogTitle className="flex items-center gap-2 text-base font-display">
            <Settings2 className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />
            Ajustes
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Statistics */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Estadísticas (vs Máquina)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Victorias" value={stats.wins} color="green" />
              <StatCard label="Derrotas" value={stats.losses} color="wine" />
              <StatCard label="Tablas" value={stats.draws} color="gold" />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <StatCard label="Partidas" value={stats.gamesPlayed} small />
              <StatCard
                label="% Victorias"
                value={`${winRate}%`}
                small
              />
              <StatCard
                label="Mejor racha"
                value={stats.bestStreak}
                small
              />
            </div>
            {stats.fastestWinMoves != null && (
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                <Trophy className="inline h-3 w-3 mr-1 text-accent-gold" />
                Victoria más rápida: {stats.fastestWinMoves} jugadas
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full h-8 text-[11px] text-muted-foreground hover:text-accent-wine dark:hover:text-accent-wine-soft"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Borrar estadísticas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[340px]">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar estadísticas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todas tus estadísticas guardadas. Esta
                    acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-accent-wine hover:bg-accent-wine/90 text-[#F3EBD8]"
                    onClick={() => {
                      const fresh = resetStats();
                      setStats(fresh);
                      toast.success("Estadísticas borradas");
                    }}
                  >
                    Borrar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <div className="h-px bg-border/60" />

          {/* Board theme */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              <Palette className="h-3.5 w-3.5" />
              Tema del tablero
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
                const t = getBoardTheme(id);
                const active = settings.boardTheme === id;
                return (
                  <button
                    key={id}
                    onClick={() => settings.setBoardTheme(id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-1.5 border-2 transition-all",
                      active
                        ? "border-accent-gold bg-accent-gold/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <div
                      className="grid grid-cols-2 grid-rows-2 w-9 h-9 rounded overflow-hidden ring-1 ring-black/10"
                      style={{ background: t.light }}
                    >
                      <span style={{ background: t.light }} />
                      <span style={{ background: t.dark }} />
                      <span style={{ background: t.dark }} />
                      <span style={{ background: t.light }} />
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground leading-none text-center">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Piece set (artwork) */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 mt-4">
              <Palette className="h-3.5 w-3.5" />
              Diseño de piezas
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {PIECE_SETS_META.map((s) => {
                const active = settings.pieceSet === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => settings.setPieceSet(s.id as PieceSetId)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-1.5 border-2 transition-all",
                      active
                        ? "border-accent-gold bg-accent-gold/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex h-10 w-full items-center justify-center gap-1 rounded bg-card ring-1 ring-black/10">
                      <span className="text-2xl">
                        <ChessPiece
                          type="n"
                          color="w"
                          pieceSet={s.id as PieceSetId}
                        />
                      </span>
                      <span className="text-2xl">
                        <ChessPiece
                          type="n"
                          color="b"
                          pieceSet={s.id as PieceSetId}
                        />
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground leading-none text-center">
                      {s.name}
                    </span>
                    <span className="text-[8px] text-muted-foreground/70 leading-tight text-center">
                      {s.author}
                      <br />
                      {s.license}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Piece finish */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 mt-4">
              <Palette className="h-3.5 w-3.5" />
              Acabado de piezas
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {PIECE_STYLES.map((p) => {
                const active = settings.pieceStyle === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => settings.setPieceStyle(p.id as PieceStyleId)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-1.5 border-2 transition-all",
                      active
                        ? "border-accent-gold bg-accent-gold/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-card text-2xl ring-1 ring-black/10">
                      <ChessPiece
                        type="n"
                        color="w"
                        pieceSet={settings.pieceSet}
                        pieceStyle={p.id as PieceStyleId}
                      />
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground leading-none text-center">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-border/60" />

          {/* Music */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              <Music className="h-3.5 w-3.5" />
              Música
            </h3>
            <ToggleRow
              icon={
                settings.musicEnabled ? (
                  <Music className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />
                ) : (
                  <Music className="h-4 w-4 text-muted-foreground" />
                )
              }
              label="Música de fondo"
              desc="4 estilos, generada en vivo"
              value={settings.musicEnabled}
              onToggle={settings.toggleMusic}
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {MUSIC_TRACKS.map((t) => {
                const active = settings.musicTrack === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => settings.setMusicTrack(t.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg p-2 border-2 transition-all",
                      active
                        ? "border-accent-gold bg-accent-gold/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span className="text-xs font-medium">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Toggles */}
          <section className="space-y-1">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              <Settings2 className="h-3.5 w-3.5" />
              Preferencias
            </h3>
            <ToggleRow
              icon={
                settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )
              }
              label="Sonidos"
              desc="Efectos al mover y capturar"
              value={settings.soundEnabled}
              onToggle={settings.toggleSound}
            />
            <ToggleRow
              icon={<Vibrate className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />}
              label="Vibración"
              desc="Respuesta háptica en móvil"
              value={settings.hapticsEnabled}
              onToggle={settings.toggleHaptics}
            />
            <ToggleRow
              icon={<Type className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />}
              label="Coordenadas"
              desc="Mostrar letras y números"
              value={settings.showCoordinates}
              onToggle={settings.toggleCoordinates}
            />
            <ToggleRow
              icon={<Highlighter className="h-4 w-4 text-accent-green dark:text-accent-green-soft" />}
              label="Resaltar último movimiento"
              desc="Marca la jugada reciente"
              value={settings.highlightLastMove}
              onToggle={settings.toggleHighlightLastMove}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: number | string;
  color?: "green" | "wine" | "gold";
  small?: boolean;
}) {
  const colorClass =
    color === "green"
      ? "text-accent-green dark:text-accent-green-soft"
      : color === "wine"
        ? "text-accent-wine dark:text-accent-wine-soft"
        : color === "gold"
          ? "text-accent-gold dark:text-accent-gold-soft"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 px-2 py-1.5 text-center">
      <motion.div
        key={String(value)}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className={cn(
          "font-bold tabular-nums",
          small ? "text-base" : "text-xl",
          colorClass
        )}
      >
        {value}
      </motion.div>
      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[10px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors shrink-0",
          value ? "bg-accent-green dark:bg-accent-green-soft" : "bg-muted-foreground/30"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
            value ? "right-0.5" : "left-0.5"
          )}
        />
      </div>
    </button>
  );
}
