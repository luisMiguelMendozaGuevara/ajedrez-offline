"use client";

import { useChessGame } from "@/hooks/useChessGame";
import { CapturedPieces } from "./CapturedPieces";
import { ChessClock } from "./ChessClock";
import { PieceColor, PieceType } from "@/lib/chess/types";
import { cn } from "@/lib/utils";
import { Crown, Bot, User, Users } from "lucide-react";

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
  const timeControl = useChessGame((s) => s.mode.timeControl);

  const isActive = turn === color && status !== "checkmate" && status !== "stalemate" && status !== "draw" && status !== "resigned";

  // Captured pieces shown next to a player are the pieces THEY captured
  const myCaptured: PieceType[] = color === "w" ? capturedByWhite : capturedByBlack;
  const oppCaptured: PieceType[] = color === "w" ? capturedByBlack : capturedByWhite;

  const Icon = icon === "bot" ? Bot : icon === "users" ? Users : User;
  const hasClock = !!timeControl && timeControl.initialSeconds > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2 border transition-all",
        isActive
          ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
          : "border-border/60 bg-card/60"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            color === "w"
              ? "bg-gradient-to-br from-slate-100 to-slate-300 text-slate-800"
              : "bg-gradient-to-br from-slate-700 to-slate-900 text-slate-100"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{label}</span>
            {color === "w" ? (
              <Crown className="h-3 w-3 text-amber-400" />
            ) : (
              <Crown className="h-3 w-3 text-slate-400" />
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
          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            …
          </span>
        )}
        {!hasClock && (
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              color === "w" ? "bg-slate-100 ring-1 ring-slate-400" : "bg-slate-900",
              isActive && "ring-2 ring-emerald-500/70"
            )}
          />
        )}
      </div>
    </div>
  );
}
