"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useChessGame } from "@/hooks/useChessGame";
import { useSettings } from "@/hooks/useSettings";
import { GameStatus, PieceColor, PieceType, PIECE_VALUES, PIECE_NAMES } from "@/lib/chess/types";
import { ChessPiece } from "./ChessPiece";
import { motion } from "framer-motion";
import { Trophy, Handshake, Flag, Crown, Clock, Target, Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameOverDialogProps {
  onNewGame: () => void;
  onRematch: () => void;
}

export function GameOverDialog({ onNewGame, onRematch }: GameOverDialogProps) {
  const status = useChessGame((s) => s.status);
  const winner = useChessGame((s) => s.winner);
  const mode = useChessGame((s) => s.mode);
  const history = useChessGame((s) => s.history);
  const capturedByWhite = useChessGame((s) => s.capturedByWhite);
  const capturedByBlack = useChessGame((s) => s.capturedByBlack);
  const whiteTime = useChessGame((s) => s.whiteTime);
  const blackTime = useChessGame((s) => s.blackTime);

  const open =
    status === "checkmate" ||
    status === "stalemate" ||
    status === "draw" ||
    status === "resigned";

  if (!open) return null;

  let title = "";
  let subtitle = "";
  let icon: React.ReactNode = null;
  let accent = "green";

  if (status === "checkmate") {
    const youWon = mode.type === "ai" ? winner === mode.playerColor : false;
    title = mode.type === "ai" ? (youWon ? "¡Victoria!" : "Derrota") : `¡Jaque mate!`;
    subtitle =
      mode.type === "ai"
        ? youWon
          ? "Has ganado contra la máquina."
          : "La máquina te ha dado jaque mate."
        : `Ganan las ${winner === "w" ? "blancas" : "negras"}.`;
    icon = <Trophy className="h-10 w-10" />;
    accent = youWon || mode.type === "human" ? "green" : "wine";
  } else if (status === "stalemate") {
    title = "Ahogado";
    subtitle = "La partida termina en tablas (ahogado).";
    icon = <Handshake className="h-10 w-10" />;
    accent = "gold";
  } else if (status === "draw") {
    title = "Tablas";
    subtitle = "La partida termina en empate.";
    icon = <Handshake className="h-10 w-10" />;
    accent = "gold";
  } else if (status === "resigned") {
    const youResigned = mode.type === "ai" ? winner !== mode.playerColor : false;
    title = mode.type === "ai" ? (youResigned ? "Te rendiste" : "¡Victoria!") : "Rendición";
    subtitle =
      mode.type === "ai"
        ? youResigned
          ? "Te has rendido."
          : "La máquina se rindió."
        : `Ganan las ${winner === "w" ? "blancas" : "negras"}.`;
    icon = <Flag className="h-10 w-10" />;
    accent = youResigned ? "wine" : "green";
  }

  const accentMap: Record<string, string> = {
    green: "from-[#35513F] to-[#22362B] text-[#F3EBD8]",
    wine: "from-[#7A2E2B] to-[#4E1B19] text-[#F3EBD8]",
    gold: "from-[#A98A4F] to-[#7A5F2E] text-[#241C16]",
  };

  // Compute stats
  const totalMoves = Math.ceil(history.length / 2);
  const whiteCaptures = capturedByWhite.length;
  const blackCaptures = capturedByBlack.length;
  const totalCaptures = whiteCaptures + blackCaptures;
  const materialDiff = Math.abs(
    capturedByWhite.reduce((s, p) => s + PIECE_VALUES[p], 0) -
    capturedByBlack.reduce((s, p) => s + PIECE_VALUES[p], 0)
  );

  const hasClock = mode.timeControl && mode.timeControl.initialSeconds > 0;
  const whiteTimeStr = hasClock ? formatTime(whiteTime) : null;
  const blackTimeStr = hasClock ? formatTime(blackTime) : null;

  // Count checks given
  const checksGiven = history.filter((h) => h.san?.endsWith("+")).length;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`flex flex-col items-center pt-7 pb-5 bg-gradient-to-br ${accentMap[accent]}`}
        >
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            {icon}
          </motion.div>
          <h2 className="mt-3 text-3xl font-display font-semibold">{title}</h2>
          <p className="mt-1 text-sm opacity-85 px-6 text-center">
            {subtitle}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Swords className="h-3.5 w-3.5" />}
              label="Jugadas"
              value={String(totalMoves)}
            />
            <StatCard
              icon={<Target className="h-3.5 w-3.5" />}
              label="Capturas"
              value={String(totalCaptures)}
              sub={`${whiteCaptures}W / ${blackCaptures}B`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Jaques"
              value={String(checksGiven)}
            />
            {materialDiff > 0 ? (
              <StatCard
                icon={<Crown className="h-3.5 w-3.5" />}
                label="Ventaja"
                value={`+${Math.round(materialDiff / 100)}`}
                sub="peones"
              />
            ) : (
              <StatCard
                icon={<Handshake className="h-3.5 w-3.5" />}
                label="Material"
                value="Igualado"
              />
            )}
          </div>

          {hasClock && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Tiempo blancas"
                value={whiteTimeStr!}
              />
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Tiempo negras"
                value={blackTimeStr!}
              />
            </div>
          )}

          {/* Captured pieces summary */}
          {(whiteCaptures > 0 || blackCaptures > 0) && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Piezas capturadas
              </div>
              <div className="space-y-1">
                {whiteCaptures > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground w-12">Blancas</span>
                    <div className="flex flex-wrap gap-0.5">
                      {capturedByWhite.map((p, i) => (
                        <CapturedGlyph key={i} type={p} color="b" />
                      ))}
                    </div>
                  </div>
                )}
                {blackCaptures > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground w-12">Negras</span>
                    <div className="flex flex-wrap gap-0.5">
                      {capturedByBlack.map((p, i) => (
                        <CapturedGlyph key={i} type={p} color="w" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={onRematch}
              className="flex-1 h-11 bg-accent-green hover:bg-accent-green/90 text-[#F3EBD8]"
            >
              <Crown className="h-4 w-4 mr-2" />
              Revancha
            </Button>
            <Button onClick={onNewGame} variant="outline" className="flex-1 h-11">
              Cambiar modo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const CAPTURED_GLYPHS: Record<PieceType, string> = {
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function CapturedGlyph({ type, color }: { type: PieceType; color: PieceColor }) {
  void CAPTURED_GLYPHS;
  const pieceSetId = useSettings((s) => s.pieceSet);
  return (
    <span
      className={cn("leading-none inline-flex")}
      style={{ fontSize: "15px" }}
      title={PIECE_NAMES[type]}
    >
      <ChessPiece type={type} color={color} pieceSet={pieceSetId} />
    </span>
  );
}

void (null as unknown as GameStatus);
void (null as unknown as PieceColor);
