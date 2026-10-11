"use client";

import { useChessGame } from "@/hooks/useChessGame";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HistoryEntry } from "@/hooks/useChessGame";
import { PIECE_NAMES, PieceType } from "@/lib/chess/types";
import { motion } from "framer-motion";

// Build a human-readable description for a move (e.g. "Caballo a f3", "Peón captura d5").
function describeMove(entry: HistoryEntry): string {
  const m = entry.move;
  const pieceName = PIECE_NAMES[m.piece];
  const toAlg = squareAlg(m.to.row, m.to.col);

  if (m.isCastle === "k") return "Enroque corto (O-O)";
  if (m.isCastle === "q") return "Enroque largo (O-O-O)";

  let desc = pieceName;
  if (m.captured || m.isEnPassant) {
    const capName = m.captured ? PIECE_NAMES[m.captured] : "peón";
    desc += ` captura ${capName} en ${toAlg}`;
  } else {
    desc += ` a ${toAlg}`;
  }
  if (m.promotion) {
    desc += ` (promociona a ${PIECE_NAMES[m.promotion]})`;
  }
  if (m.san?.endsWith("+")) desc += " — ¡Jaque!";
  if (m.san?.endsWith("#")) desc += " — ¡Jaque mate!";
  return desc;
}

function squareAlg(row: number, col: number): string {
  const file = String.fromCharCode("a".charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}

export function MoveHistory() {
  const history = useChessGame((s) => s.history);
  const lastMove = useChessGame((s) => s.lastMove);

  // Pair moves: white move + black move per row
  const pairs: {
    num: number;
    whiteEntry?: HistoryEntry;
    blackEntry?: HistoryEntry;
    whiteIdx?: number;
    blackIdx?: number;
  }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      num: i / 2 + 1,
      whiteEntry: history[i],
      blackEntry: history[i + 1],
      whiteIdx: i,
      blackIdx: i + 1,
    });
  }

  const isLast = (idx: number) =>
    lastMove && idx === history.length - 1;

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
            <TooltipProvider delayDuration={200}>
              <div className="font-mono text-xs">
                {pairs.map((pair) => (
                  <div
                    key={pair.num}
                    className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1 px-2 py-1 rounded hover:bg-muted/50"
                  >
                    <span className="text-muted-foreground text-right">
                      {pair.num}.
                    </span>
                    {pair.whiteEntry ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.span
                            initial={
                              isLast(pair.whiteIdx!)
                                ? { backgroundColor: "rgba(169,138,79,0.35)" }
                                : false
                            }
                            animate={{ backgroundColor: "rgba(0,0,0,0)" }}
                            transition={{ duration: 1.2 }}
                            className="px-1 text-foreground font-medium rounded cursor-help"
                          >
                            {pair.whiteEntry.san}
                          </motion.span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-[220px] text-xs"
                        >
                          {describeMove(pair.whiteEntry)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span />
                    )}
                    {pair.blackEntry ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.span
                            initial={
                              isLast(pair.blackIdx!)
                                ? { backgroundColor: "rgba(169,138,79,0.35)" }
                                : false
                            }
                            animate={{ backgroundColor: "rgba(0,0,0,0)" }}
                            transition={{ duration: 1.2 }}
                            className="px-1 text-foreground/80 rounded cursor-help"
                          >
                            {pair.blackEntry.san}
                          </motion.span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-[220px] text-xs"
                        >
                          {describeMove(pair.blackEntry)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

void (null as unknown as PieceType);
