"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useChessGame } from "@/hooks/useChessGame";
import { GameStatus, PieceColor } from "@/lib/chess/types";
import { motion } from "framer-motion";
import { Trophy, Handshake, Flag, Crown } from "lucide-react";

interface GameOverDialogProps {
  onNewGame: () => void;
  onRematch: () => void;
}

export function GameOverDialog({ onNewGame, onRematch }: GameOverDialogProps) {
  const status = useChessGame((s) => s.status);
  const winner = useChessGame((s) => s.winner);
  const mode = useChessGame((s) => s.mode);

  const open =
    status === "checkmate" ||
    status === "stalemate" ||
    status === "draw" ||
    status === "resigned";

  if (!open) return null;

  let title = "";
  let subtitle = "";
  let icon: React.ReactNode = null;
  let accent = "emerald";

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
    accent = youWon || mode.type === "human" ? "emerald" : "rose";
  } else if (status === "stalemate") {
    title = "Ahogado";
    subtitle = "La partida termina en tablas (ahogado).";
    icon = <Handshake className="h-10 w-10" />;
    accent = "amber";
  } else if (status === "draw") {
    title = "Tablas";
    subtitle = "La partida termina en empate.";
    icon = <Handshake className="h-10 w-10" />;
    accent = "amber";
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
    accent = youResigned ? "rose" : "emerald";
  }

  const accentMap: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600 text-white",
    rose: "from-rose-500 to-red-600 text-white",
    amber: "from-amber-500 to-orange-600 text-white",
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-[360px] p-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`flex flex-col items-center pt-8 pb-6 bg-gradient-to-br ${accentMap[accent]}`}
        >
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            {icon}
          </motion.div>
          <h2 className="mt-3 text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/85 px-6 text-center">
            {subtitle}
          </p>
        </motion.div>

        <div className="p-4 flex flex-col gap-2">
          <Button
            onClick={onRematch}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Revancha
          </Button>
          <Button onClick={onNewGame} variant="outline" className="w-full h-11">
            Cambiar modo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

void (null as unknown as GameStatus);
void (null as unknown as PieceColor);
