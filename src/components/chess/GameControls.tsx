"use client";

import { Button } from "@/components/ui/button";
import { useChessGame } from "@/hooks/useChessGame";
import {
  RotateCcw,
  Flag,
  RefreshCw,
  FlipHorizontal,
  Lightbulb,
  Settings2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface GameControlsProps {
  onNewGame: () => void;
  onOpenSettings: () => void;
}

export function GameControls({ onNewGame, onOpenSettings }: GameControlsProps) {
  const undo = useChessGame((s) => s.undo);
  const resign = useChessGame((s) => s.resign);
  const flipBoard = useChessGame((s) => s.flipBoard);
  const showHint = useChessGame((s) => s.showHint);
  const hintMove = useChessGame((s) => s.hintMove);
  const history = useChessGame((s) => s.history);
  const status = useChessGame((s) => s.status);
  const mode = useChessGame((s) => s.mode);
  const state = useChessGame((s) => s.state);
  const thinking = useChessGame((s) => s.thinking);

  const canUndo = history.length > 0 && status !== "resigned";
  const gameEnded =
    status === "checkmate" ||
    status === "stalemate" ||
    status === "draw" ||
    status === "resigned";
  const canHint =
    mode.type === "ai" &&
    state.turn === mode.playerColor &&
    !gameEnded &&
    !thinking &&
    !hintMove;

  return (
    <div className="grid grid-cols-6 gap-1.5">
      <ControlButton
        onClick={undo}
        disabled={!canUndo}
        icon={<RotateCcw className="h-4 w-4" />}
        label="Deshacer"
        className="col-span-2"
      />
      <ControlButton
        onClick={showHint}
        disabled={!canHint}
        icon={<Lightbulb className="h-4 w-4" />}
        label="Pista"
        active={!!hintMove}
      />
      <ControlButton
        onClick={flipBoard}
        icon={<FlipHorizontal className="h-4 w-4" />}
        label="Girar"
      />
      <ControlButton
        onClick={onOpenSettings}
        icon={<Settings2 className="h-4 w-4" />}
        label="Ajustes"
      />
      <ControlButton
        onClick={onNewGame}
        icon={<RefreshCw className="h-4 w-4" />}
        label="Nueva"
        variant="primary"
      />

      <div className="col-span-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
              disabled={gameEnded}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Rendirse
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[340px]">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Rendirse?</AlertDialogTitle>
              <AlertDialogDescription>
                Si te rindes, perderás la partida. Esta acción no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, seguir jugando</AlertDialogCancel>
              <AlertDialogAction
                onClick={resign}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Sí, rendirme
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  icon,
  label,
  variant = "outline",
  active = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: "outline" | "primary";
  active?: boolean;
  className?: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      size="sm"
      className={cn(
        "h-10 flex-col gap-0.5 px-1 py-1.5 text-[10px] font-medium",
        variant === "primary" &&
          "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
        active &&
          "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400",
        disabled && "opacity-40",
        className
      )}
    >
      <span className="h-4 flex items-center justify-center">{icon}</span>
      {label}
    </Button>
  );
}
