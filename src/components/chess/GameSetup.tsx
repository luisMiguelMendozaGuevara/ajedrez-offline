"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  GameMode,
  PieceColor,
  Difficulty,
  DIFFICULTY_META,
  TIME_PRESETS,
} from "@/lib/chess/types";
import { motion } from "framer-motion";
import {
  Bot,
  Users,
  Crown,
  Play,
  Clock,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useChessGame } from "@/hooks/useChessGame";

interface GameSetupProps {
  onStart: (mode: GameMode, blindfold: boolean) => void;
  onImportPgn: (pgn: string) => void;
}

type SetupType = "ai" | "human";

export function GameSetup({ onStart, onImportPgn }: GameSetupProps) {
  const [type, setType] = useState<SetupType>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<PieceColor>("w");
  const [timePresetId, setTimePresetId] = useState("none");
  const [blindfold, setBlindfold] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadPgn = useChessGame((s) => s.loadPgn);

  const handleStart = () => {
    const preset = TIME_PRESETS.find((p) => p.id === timePresetId)!;
    const timeControl =
      preset.id === "none"
        ? undefined
        : { initialSeconds: preset.seconds, increment: preset.increment };
    if (type === "ai") {
      onStart(
        { type: "ai", difficulty, playerColor, timeControl },
        blindfold
      );
    } else {
      onStart({ type: "human", playerColor: "w", timeControl }, blindfold);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const ok = loadPgn(text);
      if (ok) {
        toast.success(`Partida PGN cargada (${file.name})`);
        onImportPgn(text);
      } else {
        toast.error("No se pudo leer el PGN. Verifica el formato.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border-border/60 shadow-xl">
        {/* Mode selection */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Modo de juego
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <ModeCard
              active={type === "ai"}
              onClick={() => setType("ai")}
              icon={<Bot className="h-5 w-5" />}
              title="vs Máquina"
              desc="Juega contra la IA"
              accent="emerald"
            />
            <ModeCard
              active={type === "human"}
              onClick={() => setType("human")}
              icon={<Users className="h-5 w-5" />}
              title="2 Jugadores"
              desc="Multijugador offline"
              accent="violet"
            />
          </div>
        </div>

        {/* AI options */}
        {type === "ai" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Dificultad
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {DIFFICULTY_META.map((d) => (
                <DifficultyPill
                  key={d.id}
                  active={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  emoji={d.emoji}
                  label={d.label}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              {DIFFICULTY_META.find((d) => d.id === difficulty)?.description}
            </p>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-3 px-1">
              Tu color
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ColorCard
                active={playerColor === "w"}
                onClick={() => setPlayerColor("w")}
                color="w"
                label="Blancas"
                desc="Mueves primero"
              />
              <ColorCard
                active={playerColor === "b"}
                onClick={() => setPlayerColor("b")}
                color="b"
                label="Negras"
                desc="La IA empieza"
              />
            </div>
          </motion.div>
        )}

        {type === "human" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <div className="rounded-lg bg-muted/50 p-3 flex gap-3 items-start">
              <Users className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dos jugadores se turnan en el mismo dispositivo. Las blancas
                mueven primero. Usa el botón Girar para que cada jugador vea el
                tablero desde su lado.
              </p>
            </div>
          </motion.div>
        )}

        {/* Time control */}
        <div className="px-4 pb-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            <Clock className="h-3.5 w-3.5" />
            Control de tiempo
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {TIME_PRESETS.map((p) => (
              <TimePill
                key={p.id}
                active={timePresetId === p.id}
                onClick={() => setTimePresetId(p.id)}
                emoji={p.emoji}
                label={p.label}
              />
            ))}
          </div>
        </div>

        {/* Blindfold toggle */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setBlindfold(!blindfold)}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all",
              blindfold
                ? "border-amber-500 bg-amber-500/10"
                : "border-border bg-card hover:border-border/80"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  blindfold
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {blindfold ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Ajedrez a la ciega</div>
                <div className="text-[10px] text-muted-foreground">
                  Oculta las piezas para entrenar la memoria
                </div>
              </div>
            </div>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors shrink-0",
                blindfold ? "bg-amber-500" : "bg-muted-foreground/30"
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
                  blindfold ? "right-0.5" : "left-0.5"
                )}
              />
            </div>
          </button>
        </div>

        {/* PGN import */}
        <div className="px-4 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pgn,.txt"
            onChange={handleFile}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importar partida PGN
          </Button>
        </div>

        {/* Start button */}
        <div className="p-4 pt-2">
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Empezar partida
          </Button>
        </div>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground/70 mt-3 px-6">
        Gratis · Sin registro · Funciona sin conexión · Hecho para móvil
      </p>
    </motion.div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "emerald" | "violet";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-3.5 text-left transition-all",
        active
          ? accent === "emerald"
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-violet-500 bg-violet-500/10"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          active
            ? accent === "emerald"
              ? "bg-emerald-500 text-white"
              : "bg-violet-500 text-white"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function DifficultyPill({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1 transition-all",
        active
          ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "border-border bg-card text-muted-foreground hover:border-border"
      )}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[9px] font-semibold leading-tight text-center">
        {label}
      </span>
    </button>
  );
}

function TimePill({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1 transition-all",
        active
          ? "border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-400"
          : "border-border bg-card text-muted-foreground hover:border-border"
      )}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[9px] font-semibold leading-tight text-center">
        {label}
      </span>
    </button>
  );
}

function ColorCard({
  active,
  onClick,
  color,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  color: PieceColor;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 p-3 transition-all",
        active
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-border bg-card hover:border-border"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          color === "w"
            ? "bg-gradient-to-br from-slate-100 to-slate-300 text-slate-700"
            : "bg-gradient-to-br from-slate-700 to-slate-900 text-slate-100"
        )}
      >
        <Crown className="h-4 w-4" />
      </div>
      <div className="text-left">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}
