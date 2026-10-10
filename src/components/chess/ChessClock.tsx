"use client";

import { useEffect, useState } from "react";
import { useChessGame } from "@/hooks/useChessGame";
import { PieceColor } from "@/lib/chess/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChessClockProps {
  color: PieceColor;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ChessClock({ color }: ChessClockProps) {
  const whiteTime = useChessGame((s) => s.whiteTime);
  const blackTime = useChessGame((s) => s.blackTime);
  const turn = useChessGame((s) => s.state.turn);
  const status = useChessGame((s) => s.status);
  const tickClock = useChessGame((s) => s.tickClock);
  const timeControl = useChessGame((s) => s.mode.timeControl);

  const time = color === "w" ? whiteTime : blackTime;
  const isActive = turn === color && status === "playing" && status === "check";

  // Local state to re-render the clock smoothly every 200ms while active
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timeControl || timeControl.initialSeconds === 0) return;
    if (status === "checkmate" || status === "stalemate" || status === "draw" || status === "resigned")
      return;
    const interval = setInterval(() => {
      tickClock();
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [timeControl, status, tickClock]);

  if (!timeControl || timeControl.initialSeconds === 0) return null;

  const low = time <= 10 && time > 0;
  const out = time <= 0;
  const active = turn === color && (status === "playing" || status === "check");

  return (
    <motion.div
      animate={{
        scale: active ? 1.03 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-lg px-2.5 py-1 font-mono text-sm font-bold tabular-nums transition-colors min-w-[58px] text-center",
        out
          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
          : low
            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            : active
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted/60 text-muted-foreground"
      )}
    >
      {formatTime(time)}
    </motion.div>
  );
}
