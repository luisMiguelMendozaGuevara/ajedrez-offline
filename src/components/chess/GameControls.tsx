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
  Download,
  Share2,
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
import { toast } from "sonner";

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
  const exportPgn = useChessGame((s) => s.exportPgn);
  const replayMode = useChessGame((s) => s.replayMode);

  const canUndo = history.length > 0 && status !== "resigned" && !replayMode;
  const gameEnded =
    status === "checkmate" ||
    status === "stalemate" ||
    status === "draw" ||
    status === "resigned";
  const canHint =
    !gameEnded &&
    !thinking &&
    !hintMove &&
    !replayMode &&
    (mode.type !== "ai" || state.turn === mode.playerColor);
  const canExport = history.length > 0;

  const handleExport = async () => {
    const pgn = exportPgn();
    try {
      await navigator.clipboard.writeText(pgn);
      toast.success("PGN copiado al portapapeles");
    } catch {
      // Fallback: download as file
      const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `partida-${Date.now()}.pgn`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PGN descargado");
    }
  };

  const handleShare = async () => {
    const pgn = exportPgn();
    const text = `Mi partida de ajedrez:\n\n${pgn}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Partida de ajedrez", text });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Partida copiada para compartir");
      } catch {
        toast.error("No se pudo compartir");
      }
    }
  };

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

      <div className="col-span-6 grid grid-cols-3 gap-1.5">
        <ControlButton
          onClick={handleExport}
          disabled={!canExport}
          icon={<Download className="h-4 w-4" />}
          label="Exportar PGN"
          className="col-span-1"
        />
        <ControlButton
          onClick={handleShare}
          disabled={!canExport}
          icon={<Share2 className="h-4 w-4" />}
          label="Compartir"
          className="col-span-1"
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="col-span-1 h-11 rounded-lg flex-col gap-0.5 px-1 py-1.5 text-[10px] font-medium text-accent-wine dark:text-accent-wine-soft hover:text-accent-wine hover:bg-accent-wine/10 border-accent-wine/30 hover:border-accent-wine/50"
              disabled={gameEnded || replayMode}
            >
              <span className="h-4 flex items-center justify-center">
                <Flag className="h-4 w-4" />
              </span>
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
                className="bg-accent-wine hover:bg-accent-wine/90 text-[#F3EBD8]"
              >
                Sí, rendirme
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {replayMode && (
        <div className="col-span-6 rounded-lg bg-accent-slate/10 border border-accent-slate/30 px-3 py-1.5 text-[11px] text-accent-slate dark:text-accent-slate-soft text-center font-medium">
          Modo repetición PGN · estadísticas y guardado desactivados
        </div>
      )}
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
        "h-11 rounded-lg flex-col gap-0.5 px-1 py-1.5 text-[10px] font-medium border-border/70 bg-card hover:border-accent-gold/50 hover:bg-accent-gold/10 active:scale-[0.97] transition-all",
        variant === "primary" &&
          "bg-gradient-to-r from-[#35513F] to-[#22362B] hover:from-[#3E5C48] hover:to-[#2A4234] text-[#F3EBD8] hover:text-[#F3EBD8] border-transparent hover:border-transparent ring-1 ring-accent-gold/40 shadow-md",
        active &&
          "border-accent-gold bg-accent-gold/15 text-accent-gold dark:text-accent-gold-soft",
        disabled && "opacity-40",
        className
      )}
    >
      <span className="h-4 flex items-center justify-center">{icon}</span>
      {label}
    </Button>
  );
}
