"use client";

import { useMemo } from "react";
import { useChessGame } from "@/hooks/useChessGame";
import { evaluate } from "@/lib/chess/ai";
import { motion } from "framer-motion";

// Horizontal evaluation bar shown above/below the board.
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

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex-1 h-5 rounded-full overflow-hidden border border-border/60 shadow-inner shrink-0"
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
        {/* eval text */}
        <div
          className="absolute top-0 bottom-0 flex items-center px-2 z-20 text-[10px] font-bold font-mono tabular-nums"
          style={{
            left: whitePct > 0.5 ? "auto" : `${whitePct * 100}%`,
            right: whitePct > 0.5 ? `${(1 - whitePct) * 100}%` : "auto",
            color: whitePct > 0.5 ? "#1e1b2e" : "#f8fafc",
          }}
        >
          {display}
        </div>
      </div>
    </div>
  );
}
