"use client";

// Static, non-interactive mini board used for rule diagrams (Learn section).
// Uses the same vintage classic theme as PuzzleBoard, with decorative marks.
import { ChessPiece } from "./ChessPiece";
import { Piece, PieceType } from "@/lib/chess/types";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";

export interface MiniBoardMark {
  sq: string; // square in algebraic notation, e.g. "e4"
  kind: "move" | "target" | "capture" | "danger" | "ok";
}

interface MiniBoardProps {
  /** FEN placement field; row 0 = rank 8, uppercase = white. */
  placement: string;
  marks?: MiniBoardMark[];
  caption?: string;
  showCoords?: boolean; // file/rank labels, off by default
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Minimal FEN placement parser: only the first field ("rnbqkbnr/...").
function parsePlacement(placement: string): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null)
  );
  const rows = placement.split("/");
  rows.forEach((row, r) => {
    if (r > 7) return;
    let c = 0;
    for (const ch of row) {
      if (c > 7) break;
      if (ch >= "1" && ch <= "8") {
        c += ch.charCodeAt(0) - 48;
        continue;
      }
      const type = ch.toLowerCase();
      if (
        type === "p" ||
        type === "n" ||
        type === "b" ||
        type === "r" ||
        type === "q" ||
        type === "k"
      ) {
        board[r][c] = {
          type: type as PieceType,
          color: ch === ch.toUpperCase() ? "w" : "b",
        };
        c += 1;
      }
    }
  });
  return board;
}

export function MiniBoard({
  placement,
  marks = [],
  caption,
  showCoords = false,
}: MiniBoardProps) {
  const pieceSetId = useSettings((s) => s.pieceSet);
  const pieceStyleId = useSettings((s) => s.pieceStyle);
  const theme = getBoardTheme("classic");

  const board = parsePlacement(placement);
  const markBySquare = new Map<string, MiniBoardMark["kind"]>();
  for (const m of marks) markBySquare.set(m.sq.toLowerCase(), m.kind);

  return (
    <div className="w-full max-w-[260px] mx-auto">
      <div
        role="img"
        aria-label={caption ?? "Diagrama"}
        className="relative w-full rounded-lg overflow-hidden shadow-lg"
        style={{
          background: theme.border,
          padding: "6px",
          aspectRatio: "1 / 1",
          boxShadow:
            "0 10px 22px -14px rgba(28,21,15,0.7), inset 0 0 0 1px rgba(198,161,91,0.45)",
        }}
      >
        <div
          className="relative w-full h-full rounded-[4px] overflow-hidden"
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(198,161,91,0.6), inset 0 2px 6px rgba(28,21,15,0.3)",
          }}
        >
          <div
            className="grid w-full h-full"
            style={{
              gridTemplateColumns: "repeat(8, 1fr)",
              gridTemplateRows: "repeat(8, 1fr)",
            }}
          >
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => {
                const isLight = (r + c) % 2 === 0;
                const piece = board[r][c];
                const mark = markBySquare.get(`${FILES[c]}${8 - r}`);
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative flex items-center justify-center"
                    style={{
                      backgroundColor: isLight ? theme.light : theme.dark,
                      fontSize: "clamp(0.8rem, 5.4vw, 1.35rem)",
                    }}
                  >
                    {showCoords && c === 0 && (
                      <span
                        className="absolute top-[2px] left-[3px] text-[7px] font-bold leading-none pointer-events-none opacity-80"
                        style={{ color: isLight ? theme.dark : theme.light }}
                      >
                        {8 - r}
                      </span>
                    )}
                    {showCoords && r === 7 && (
                      <span
                        className="absolute bottom-[1px] right-[3px] text-[7px] font-bold leading-none pointer-events-none opacity-80"
                        style={{ color: isLight ? theme.dark : theme.light }}
                      >
                        {FILES[c]}
                      </span>
                    )}
                    {mark === "danger" && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(122,46,43,0.6) 0%, rgba(122,46,43,0.25) 62%, rgba(122,46,43,0) 100%)",
                        }}
                      />
                    )}
                    {mark === "ok" && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          boxShadow:
                            "inset 0 0 0 3px rgba(53,81,63,0.85), inset 0 0 10px rgba(53,81,63,0.35)",
                        }}
                      />
                    )}
                    {piece && (
                      <ChessPiece
                        type={piece.type}
                        color={piece.color}
                        pieceSet={pieceSetId}
                        pieceStyle={pieceStyleId}
                        className="relative z-10"
                      />
                    )}
                    {mark === "move" && (
                      <span
                        className="absolute w-[30%] h-[30%] rounded-full pointer-events-none z-20"
                        style={{
                          background: "rgba(169,138,79,0.92)",
                          boxShadow: "0 0 0 1px rgba(90,66,26,0.5)",
                        }}
                      />
                    )}
                    {mark === "target" && (
                      <span
                        className={
                          piece
                            ? "absolute inset-[7%] rounded-full border-2 border-dashed pointer-events-none z-20"
                            : "absolute w-[42%] h-[42%] rounded-full border-2 border-dashed pointer-events-none z-20"
                        }
                        style={{ borderColor: "rgba(169,138,79,0.95)" }}
                      />
                    )}
                    {mark === "capture" && (
                      <span
                        className="absolute inset-[8%] rounded-full border-[3px] pointer-events-none z-20"
                        style={{ borderColor: "rgba(122,46,43,0.9)" }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {caption && (
        <p className="mt-1.5 text-center text-[10px] leading-snug text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}
