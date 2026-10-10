"use client";

import { useChessGame } from "@/hooks/useChessGame";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MoveHistory() {
  const history = useChessGame((s) => s.history);

  // Pair moves: white move + black move per row
  const pairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      num: i / 2 + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Historial
        </span>
        <span className="text-[10px] text-muted-foreground">
          {history.length} jugadas
        </span>
      </div>
      <ScrollArea className="flex-1 max-h-64">
        <div className="p-1">
          {pairs.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Aún no hay movimientos.
              <br />
              ¡Comienza la partida!
            </div>
          ) : (
            <div className="font-mono text-xs">
              {pairs.map((pair) => (
                <div
                  key={pair.num}
                  className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1 px-2 py-1 rounded hover:bg-muted/50"
                >
                  <span className="text-muted-foreground text-right">
                    {pair.num}.
                  </span>
                  <span className="px-1 text-foreground font-medium">
                    {pair.white ?? ""}
                  </span>
                  <span className="px-1 text-foreground/80">
                    {pair.black ?? ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

void cn;
