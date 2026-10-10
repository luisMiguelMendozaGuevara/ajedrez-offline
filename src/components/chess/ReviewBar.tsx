"use client";

import { useChessGame } from "@/hooks/useChessGame";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewBar() {
  const reviewMode = useChessGame((s) => s.reviewMode);
  const reviewPly = useChessGame((s) => s.reviewPly);
  const reviewTotal = useChessGame((s) => s.reviewTotal);
  const history = useChessGame((s) => s.history);
  const enterReview = useChessGame((s) => s.enterReview);
  const exitReview = useChessGame((s) => s.exitReview);
  const reviewStep = useChessGame((s) => s.reviewStep);
  const reviewTo = useChessGame((s) => s.reviewTo);

  // Show entry button when not in review mode (only if there's history)
  if (!reviewMode) {
    if (history.length === 0) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-9 text-[11px] text-muted-foreground border border-border/60"
        onClick={enterReview}
      >
        <Play className="h-3.5 w-3.5 mr-1.5" />
        Repasar partida ({history.length} jugadas)
      </Button>
    );
  }

  const pct = reviewTotal > 0 ? (reviewPly / reviewTotal) * 100 : 0;

  return (
    <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Modo repaso
        </span>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
          {reviewPly}/{reviewTotal}
        </span>
        <button
          onClick={exitReview}
          className="text-muted-foreground hover:text-foreground"
          title="Salir del repaso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar with scrub */}
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
        <input
          type="range"
          min={0}
          max={reviewTotal}
          value={reviewPly}
          onChange={(e) => reviewTo(parseInt(e.target.value, 10))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Posición del repaso"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1.5">
        <ReviewButton onClick={() => reviewTo(0)} disabled={reviewPly === 0}>
          <SkipBack className="h-4 w-4" />
        </ReviewButton>
        <ReviewButton
          onClick={() => reviewStep(-1)}
          disabled={reviewPly === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </ReviewButton>
        <ReviewButton
          onClick={() => reviewStep(1)}
          disabled={reviewPly >= reviewTotal}
        >
          <ChevronRight className="h-4 w-4" />
        </ReviewButton>
        <ReviewButton
          onClick={() => reviewTo(reviewTotal)}
          disabled={reviewPly >= reviewTotal}
        >
          <SkipForward className="h-4 w-4" />
        </ReviewButton>
        <ReviewButton onClick={() => reviewTo(reviewTotal)}>
          <RotateCcw className="h-4 w-4" />
        </ReviewButton>
      </div>

      {/* Current move display */}
      {reviewPly > 0 && history[reviewPly - 1] && (
        <div className="text-center text-xs">
          <span className="text-muted-foreground">
            {Math.ceil(reviewPly / 2)}
            {reviewPly % 2 === 1 ? ". " : "... "}
          </span>
          <span className="font-mono font-semibold">
            {history[reviewPly - 1].san}
          </span>
        </div>
      )}
      {reviewPly === 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Posición inicial
        </div>
      )}
    </div>
  );
}

function ReviewButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0",
        disabled && "opacity-40"
      )}
    >
      {children}
    </Button>
  );
}
