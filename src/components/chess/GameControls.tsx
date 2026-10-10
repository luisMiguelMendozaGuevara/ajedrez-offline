"use client";

import { Button } from "@/components/ui/button";
import { useChessGame } from "@/hooks/useChessGame";
import {
  RotateCcw,
  Flag,
  RefreshCw,
  FlipHorizontal,
  Eye,
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

export function GameControls({ onNewGame }: { onNewGame: () => void }) {
  const undo = useChessGame((s) => s.undo);
  const resign = useChessGame((s) => s.resign);
  const flipBoard = useChessGame((s) => s.flipBoard);
  const history = useChessGame((s) => s.history);
  const status = useChessGame((s) => s.status);

  const canUndo = history.length > 0 && status !== "resigned";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 h-10"
        onClick={undo}
        disabled={!canUndo}
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Deshacer
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={flipBoard}
        title="Girar tablero"
      >
        <FlipHorizontal className="h-4 w-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            disabled={status === "checkmate" || status === "stalemate" || status === "draw" || status === "resigned"}
            title="Rendirse"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rendirse?</AlertDialogTitle>
            <AlertDialogDescription>
              Si te rindes, perderás la partida. Esta acción no se puede deshacer.
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

      <Button
        size="sm"
        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onNewGame}
      >
        <RefreshCw className="h-4 w-4 mr-1.5" />
        Nueva
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="hidden"
        title="hidden"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}
