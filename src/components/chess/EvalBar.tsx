"use client";

import { useMemo } from "react";
import { useChessGame } from "@/hooks/useChessGame";
import { evaluate } from "@/lib/chess/ai";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

// Horizontal evaluation bar shown above the board.
// Left = black advantage, Right = white advantage.
export function EvalBar() {
  const state = useChessGame((s) => s.state);

  const evalCp = useMemo(() => {
    return evaluate(state, "w");
  }, [state]);

  // Clamp to [-1500, 1500] for display, convert to a 0..1 white fraction
  const clamped = Math.max(-1500, Math.min(1500, evalCp));
  const whitePct = 0.5 + clamped / 3000; // 0..1

  const pawns = evalCp / 100;
  const display =
    Math.abs(pawns) >= 100
      ? `${pawns > 0 ? "M" : "-M"}`
      : `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;

  const whiteAhead = pawns > 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5">
      <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
        Eval
      </span>
      <div
        className="relative flex-1 h-5 rounded-full overflow-hidden shadow-inner shrink-0"
        style={{ background: "#1e1b2e" }}
      >
        {/* Black portion (left) */}
        <motion.div
          className="absolute top-0 bottom-0 left-0 bg-slate-800"
          animate={{ width: `${(1 - whitePct) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* White portion (right) */}
        <motion.div
          className="absolute top-0 bottom-0 right-0 bg-slate-100"
          animate={{ width: `${whitePct * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* center marker */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-amber-400/70 z-10" />
      </div>
      <span
        className="text-xs font-bold font-mono tabular-nums shrink-0 min-w-[2.5rem] text-right"
        style={{
          color: whiteAhead ? "#10b981" : pawns < 0 ? "#f43f5e" : undefined,
        }}
      >
        {display}
      </span>
    </div>
  );
}
