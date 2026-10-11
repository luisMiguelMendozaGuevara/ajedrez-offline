"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChessGame } from "@/hooks/useChessGame";
import { useSettings } from "@/hooks/useSettings";
import { ChessPiece } from "./ChessPiece";
import { PieceType } from "@/lib/chess/types";
import { motion } from "framer-motion";

const OPTIONS: PieceType[] = ["q", "r", "b", "n"];
const LABELS: Record<PieceType, string> = {
  q: "Dama",
  r: "Torre",
  b: "Alfil",
  n: "Caballo",
  p: "Peón",
  k: "Rey",
};

export function PromotionDialog() {
  const promotionPending = useChessGame((s) => s.promotionPending);
  const choosePromotion = useChessGame((s) => s.choosePromotion);
  const cancelPromotion = useChessGame((s) => s.cancelPromotion);
  const state = useChessGame((s) => s.state);
  const pieceSetId = useSettings((s) => s.pieceSet);
  const pieceStyleId = useSettings((s) => s.pieceStyle);

  const color = promotionPending ? state.turn : "w";

  return (
    <Dialog
      open={!!promotionPending}
      onOpenChange={(open) => {
        if (!open) cancelPromotion();
      }}
    >
      <DialogContent className="max-w-[320px] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-center text-base">
            Promoción de peón
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-xs text-muted-foreground px-4 pb-3">
          Elige la pieza para tu promoción
        </p>
        <div className="grid grid-cols-4 gap-2 p-3">
          {OPTIONS.map((type, i) => (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => choosePromotion(type)}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 hover:bg-accent hover:border-accent-gold/70 transition-colors"
            >
              <span className="text-3xl leading-none">
                <ChessPiece
                  type={type}
                  color={color}
                  pieceSet={pieceSetId}
                  pieceStyle={pieceStyleId}
                />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {LABELS[type]}
              </span>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
