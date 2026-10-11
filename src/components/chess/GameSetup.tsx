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
  Shuffle,
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
  const [playerColor, setPlayerColor] = useState<PieceColor | "random">("w");
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
      const color: PieceColor =
        playerColor === "random"
          ? Math.random() < 0.5
            ? "w"
            : "b"
          : playerColor;
      if (playerColor === "random") {
        toast.success(
          `Sorteo: juegas con ${color === "w" ? "blancas" : "negras"}`
        );
      }
      onStart({ type: "ai", difficulty, playerColor: color, timeControl }, blindfold);
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
              accent="green"
            />
            <ModeCard
              active={type === "human"}
              onClick={() => setType("human")}
              icon={<Users className="h-5 w-5" />}
              title="2 Jugadores"
              desc="Multijugador offline"
              accent="plum"
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
            <div className="grid grid-cols-3 gap-2">
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
              <ColorCard
                active={playerColor === "random"}
                onClick={() => setPlayerColor("random")}
                color="random"
                label="Aleatorio"
                desc="Se sortea al empezar"
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
              <Users className="h-5 w-5 text-accent-plum dark:text-accent-plum-soft mt-0.5 shrink-0" />
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
                ? "border-accent-gold bg-accent-gold/10"
                : "border-border bg-card hover:border-border/80"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  blindfold
                    ? "bg-accent-gold text-[#241C16]"
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
                blindfold ? "bg-accent-gold" : "bg-muted-foreground/30"
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
            className="w-full h-12 bg-gradient-to-r from-[#35513F] to-[#22362B] hover:from-[#3E5C48] hover:to-[#2A4234] text-[#F3EBD8] font-semibold shadow-lg inset-shadow-[0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-accent-gold/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
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
  accent: "green" | "plum";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-3.5 text-left transition-all",
        active
          ? accent === "green"
            ? "border-accent-green bg-accent-green/10"
            : "border-accent-plum bg-accent-plum/10"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          active
            ? accent === "green"
              ? "bg-accent-green text-[#F3EBD8]"
              : "bg-accent-plum text-[#F3EBD8]"
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
          ? "border-accent-gold bg-accent-gold/15 text-accent-gold dark:text-accent-gold-soft"
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
          ? "border-accent-slate bg-accent-slate/15 text-accent-slate dark:text-accent-slate-soft"
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
  color: PieceColor | "random";
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 transition-all text-center",
        active
          ? "border-accent-green bg-accent-green/10"
          : "border-border bg-card hover:border-border"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          color === "w"
            ? "bg-gradient-to-br from-[#F7F0DE] to-[#D8C7A8] text-[#2B2118]"
            : color === "b"
              ? "bg-gradient-to-br from-[#3A2E24] to-[#1C150F] text-[#EFE3CF]"
              : "bg-gradient-to-br from-[#F7F0DE] via-[#B9A98C] to-[#3A2E24] text-[#2B2118]"
        )}
      >
        {color === "random" ? (
          <Shuffle className="h-4 w-4" />
        ) : (
          <Crown className="h-4 w-4" />
        )}
      </div>
      <div>
        <div className="text-xs font-semibold leading-tight">{label}</div>
        <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
          {desc}
        </div>
      </div>
    </button>
  );
}
