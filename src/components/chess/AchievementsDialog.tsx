"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllAchievements } from "@/lib/chess/achievements";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { useState, useEffect } from "react";

interface AchievementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementsDialog({
  open,
  onOpenChange,
}: AchievementsDialogProps) {
  const [items, setItems] = useState(() => getAllAchievements());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setItems(getAllAchievements());
  }, [open]);

  const unlockedCount = items.filter((i) => i.unlockedAt != null).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden max-h-[88vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-accent-gold/10 to-accent-gold/5">
          <DialogTitle className="flex items-center gap-2 text-base font-display">
            <Award className="h-4 w-4 text-accent-gold dark:text-accent-gold-soft" />
            Logros
            <span className="ml-auto mr-6 text-xs font-normal text-muted-foreground">
              {unlockedCount}/{items.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="p-3 grid grid-cols-2 gap-2">
          {items.map(({ achievement, unlockedAt }, idx) => {
            const unlocked = unlockedAt != null;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all",
                  unlocked
                    ? "border-accent-gold/60 bg-accent-gold/10"
                    : "border-border bg-card/40 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xl",
                    unlocked
                      ? "bg-gradient-to-br from-[#D8BA7D] to-[#A98A4F] shadow-md"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {unlocked ? achievement.emoji : <Lock className="h-4 w-4" />}
                </div>
                <div className="text-xs font-semibold leading-tight">
                  {achievement.name}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {achievement.description}
                </div>
                {unlocked && unlockedAt && (
                  <div className="text-[9px] text-accent-gold dark:text-accent-gold-soft font-medium mt-0.5">
                    {new Date(unlockedAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
