"use client";

import { useChessGame } from "@/hooks/useChessGame";
import { CapturedPieces } from "./CapturedPieces";
import { ChessClock } from "./ChessClock";
import { PieceColor, PieceType } from "@/lib/chess/types";
import { cn } from "@/lib/utils";
import { Crown, Bot, User, Users, Trophy } from "lucide-react";

interface PlayerBarProps {
  color: PieceColor;
  label: string;
  icon?: "bot" | "user" | "users";
}

export function PlayerBar({ color, label, icon = "user" }: PlayerBarProps) {
  const turn = useChessGame((s) => s.state.turn);
  const capturedByWhite = useChessGame((s) => s.capturedByWhite);
  const capturedByBlack = useChessGame((s) => s.capturedByBlack);
  const status = useChessGame((s) => s.status);
  const thinking = useChessGame((s) => s.thinking);
  const winner = useChessGame((s) => s.winner);
  const timeControl = useChessGame((s) => s.mode.timeControl);

  const isActive = turn === color && status !== "checkmate" && status !== "stalemate" && status !== "draw" && status !== "resigned";
  const isWinner = !!winner && winner === color;

  // Captured pieces shown next to a player are the pieces THEY captured
  const myCaptured: PieceType[] = color === "w" ? capturedByWhite : capturedByBlack;
  const oppCaptured: PieceType[] = color === "w" ? capturedByBlack : capturedByWhite;

  const Icon = icon === "bot" ? Bot : icon === "users" ? Users : User;
  const hasClock = !!timeControl && timeControl.initialSeconds > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2 border transition-all",
        isWinner
          ? "border-accent-green bg-accent-green/40 shadow-lg ring-2 ring-accent-green/50"
          : isActive
            ? "border-accent-green/80 bg-accent-green/25 shadow-md ring-1 ring-accent-green/30"
            : "border-border/60 bg-card/60"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            color === "w"
              ? "bg-gradient-to-br from-[#F7F0DE] to-[#D8C7A8] text-[#2B2118]"
              : "bg-gradient-to-br from-[#3A2E24] to-[#1C150F] text-[#EFE3CF]"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{label}</span>
            {color === "w" ? (
              <Crown className="h-3 w-3 text-accent-gold" />
            ) : (
              <Crown className="h-3 w-3 text-muted-foreground/70" />
            )}
            {isWinner && (
              <Trophy className="h-3.5 w-3.5 text-accent-gold" />
            )}
          </div>
          <div className="mt-0.5">
            <CapturedPieces
              captured={myCaptured}
              ownerColor={color}
              opponentCaptured={oppCaptured}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasClock && <ChessClock color={color} />}
        {thinking && isActive && (
          <span className="flex items-center gap-1 text-[11px] text-accent-green dark:text-accent-green-soft font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green dark:bg-accent-green-soft animate-pulse" />
            …
          </span>
        )}
        {!hasClock && (
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              color === "w"
                ? "bg-[#F7F0DE] ring-1 ring-[#B9A98C]"
                : "bg-[#241C16] ring-1 ring-[#4A342A]",
              isActive && "ring-2 ring-accent-green/70"
            )}
          />
        )}
      </div>
    </div>
  );
}
