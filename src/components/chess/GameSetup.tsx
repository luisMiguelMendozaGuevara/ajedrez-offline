"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GameMode, PieceColor } from "@/lib/chess/types";
import { motion } from "framer-motion";
import {
  Bot,
  Users,
  Crown,
  Sparkles,
  Swords,
  Shield,
  Brain,
  Zap,
  Play,
} from "lucide-react";

interface GameSetupProps {
  onStart: (mode: GameMode) => void;
}

type SetupType = "ai" | "human";

export function GameSetup({ onStart }: GameSetupProps) {
  const [type, setType] = useState<SetupType>("ai");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [playerColor, setPlayerColor] = useState<PieceColor>("w");

  const handleStart = () => {
    if (type === "ai") {
      onStart({ type: "ai", difficulty, playerColor });
    } else {
      onStart({ type: "human", playerColor: "w" });
    }
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
            <div className="grid grid-cols-3 gap-2">
              <DifficultyCard
                active={difficulty === "easy"}
                onClick={() => setDifficulty("easy")}
                icon={<Sparkles className="h-4 w-4" />}
                label="Fácil"
              />
              <DifficultyCard
                active={difficulty === "medium"}
                onClick={() => setDifficulty("medium")}
                icon={<Brain className="h-4 w-4" />}
                label="Medio"
              />
              <DifficultyCard
                active={difficulty === "hard"}
                onClick={() => setDifficulty("hard")}
                icon={<Swords className="h-4 w-4" />}
                label="Difícil"
              />
            </div>

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
                mueven primero. Puedes girar el tablero con el botón
                correspondiente para que cada jugador lo vea desde su lado.
              </p>
            </div>
          </motion.div>
        )}

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
      {active && (
        <motion.div
          layoutId={`mode-${accent}`}
          className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-offset-background pointer-events-none"
          style={{
            // @ts-expect-error css var
            "--tw-ring-color":
              accent === "emerald" ? "rgb(16 185 129)" : "rgb(139 92 246)",
          }}
        />
      )}
    </button>
  );
}

function DifficultyCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all",
        active
          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "border-border bg-card text-muted-foreground hover:border-border"
      )}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
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

void Shield;
void Zap;
