"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";
import { BOARD_THEMES, BoardThemeId, loadStats, resetStats } from "@/lib/chess/storage";
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
} from "lucide-react";
import { useState, useEffect } from "react";
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
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-emerald-500" />
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
              <StatCard label="Victorias" value={stats.wins} color="emerald" />
              <StatCard label="Derrotas" value={stats.losses} color="rose" />
              <StatCard label="Tablas" value={stats.draws} color="amber" />
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
                <Trophy className="inline h-3 w-3 mr-1 text-amber-500" />
                Victoria más rápida: {stats.fastestWinMoves} jugadas
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full h-8 text-[11px] text-muted-foreground hover:text-rose-500"
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
                    className="bg-rose-600 hover:bg-rose-700 text-white"
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
                        ? "border-emerald-500 bg-emerald-500/10"
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

          <div className="h-px bg-border/60" />

          {/* Toggles */}
          <section className="space-y-1">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              <Settings2 className="h-3.5 w-3.5" />
              Preferencias
            </h3>
            <ToggleRow
              icon={
                settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-500" />
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
              icon={<Vibrate className="h-4 w-4 text-emerald-500" />}
              label="Vibración"
              desc="Respuesta háptica en móvil"
              value={settings.hapticsEnabled}
              onToggle={settings.toggleHaptics}
            />
            <ToggleRow
              icon={<Type className="h-4 w-4 text-emerald-500" />}
              label="Coordenadas"
              desc="Mostrar letras y números"
              value={settings.showCoordinates}
              onToggle={settings.toggleCoordinates}
            />
            <ToggleRow
              icon={<Highlighter className="h-4 w-4 text-emerald-500" />}
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
  color?: "emerald" | "rose" | "amber";
  small?: boolean;
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : color === "amber"
          ? "text-amber-600 dark:text-amber-400"
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
          value ? "bg-emerald-500" : "bg-muted-foreground/30"
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
