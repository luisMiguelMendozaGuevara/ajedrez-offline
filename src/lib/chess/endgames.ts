// Endgame lessons built from FEN-like placements.

import { applyMove } from "./engine";
import { LearningLevel, OpeningMove, sanToMove } from "./openings";
import { Board, GameState, Piece, PieceColor } from "./types";

export interface EndgameLesson {
  id: string;
  title: string;
  level: LearningLevel;
  goal: "mate" | "promocion" | "tablas" | "tecnica";
  placement: string;
  turn: PieceColor;
  script: OpeningMove[];
  startNote: string;
  finalNote: string;
}

// Digits are empty squares, uppercase is white, row 0 is rank 8.
export function buildStateFromPlacement(
  placement: string,
  turn: PieceColor
): GameState {
  const board: Board = Array.from({ length: 8 }, () =>
    Array<Piece | null>(8).fill(null)
  );
  placement.split("/").forEach((rowStr, row) => {
    let col = 0;
    for (const ch of rowStr) {
      if (/\d/.test(ch)) {
        col += parseInt(ch, 10);
      } else if (col < 8) {
        board[row][col] = {
          type: ch.toLowerCase() as Piece["type"],
          color: ch === ch.toUpperCase() ? "w" : "b",
        };
        col += 1;
      }
    }
  });
  return {
    board,
    turn,
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function buildEndgameState(
  lesson: EndgameLesson,
  ply: number
): { state: GameState; ok: boolean } {
  let state = buildStateFromPlacement(lesson.placement, lesson.turn);
  for (let i = 0; i < ply && i < lesson.script.length; i++) {
    const move = sanToMove(state, lesson.script[i].san);
    if (!move) return { state, ok: false };
    state = applyMove(state, move);
  }
  return { state, ok: true };
}

export const ENDGAME_LESSONS: EndgameLesson[] = [
  {
    id: "queen-mate-basics",
    title: "Mate con dama: la técnica del rey",
    level: "principiante",
    goal: "mate",
    placement: "7k/8/5K2/6Q1/8/8/8/8",
    turn: "w",
    script: [
      {
        san: "Qg7#",
        comment: "La dama se apoya en el rey y encierra al monarca negro.",
      },
    ],
    startNote:
      "Dama y rey contra rey: encierra con la dama y remata con tu rey.",
    finalNote:
      "La dama sola no da mate: siempre debe ayudarla tu rey.",
  },
  {
    id: "back-rank-basics",
    title: "El mate de pasillo",
    level: "principiante",
    goal: "mate",
    placement: "6k1/5ppp/8/8/8/8/8/4R1K1",
    turn: "w",
    script: [
      {
        san: "Re8#",
        comment: "La torre entra en la última fila: el rey no tiene aire.",
      },
    ],
    startNote: "Rey y torre contra rey con peones: busca la última fila.",
    finalNote:
      "Un simple 'aire' (h6/h3) evita este mate; memoriza el patrón.",
  },
  {
    id: "two-rooks-ladder",
    title: "Dos torres: la escalera",
    level: "intermedio",
    goal: "tecnica",
    placement: "8/8/8/8/3k4/8/1R4K1/R7",
    turn: "w",
    script: [
      { san: "Ra4+", comment: "La primera torre corta la fila 4." },
      { san: "Kd3", comment: "El rey negro baja." },
      { san: "Rb3+", comment: "La segunda torre da jaque en la fila 3." },
      { san: "Kd2", comment: "El rey sigue descendiendo." },
      { san: "Ra2+", comment: "Nueva escalera: cortan la fila 2." },
      { san: "Kd1", comment: "El rey llega a la esquina." },
      { san: "Rb1#", comment: "¡Mate! La escalera de torres no se detiene." },
    ],
    startNote: "Dos torres contra rey solo: la técnica más fácil e infalible.",
    finalNote:
      "Con dos torres, sube la escalera: una corta la fila, la otra da mate.",
  },
  {
    id: "pawn-promotion",
    title: "El peón que corona",
    level: "principiante",
    goal: "promocion",
    placement: "k7/8/8/8/3PK3/8/8/8",
    turn: "w",
    script: [
      { san: "d5", comment: "El rey escolta al peón." },
      { san: "Ka7", comment: "El rey negro rodea." },
      { san: "d6", comment: "El peón avanza protegido." },
      { san: "Ka6", comment: "El rey negro busca el camino." },
      { san: "d7", comment: "El peón llega a la séptima." },
      { san: "Ka5", comment: "Demasiado tarde." },
      { san: "d8=Q+", comment: "¡Corona! El rey negro queda en jaque." },
    ],
    startNote: "Rey y peón contra rey: el peón corona si el rey lo escolta.",
    finalNote: "Método seguro: rey delante del peón.",
  },
  {
    id: "stalemate-warning",
    title: "Cuidado con ahogar",
    level: "intermedio",
    goal: "tablas",
    placement: "7k/8/5K2/6Q1/8/8/8/8",
    turn: "w",
    script: [
      {
        san: "Qg6",
        comment: "Error didáctico: el rey negro queda ahogado y es tablas.",
      },
    ],
    startNote:
      "Dama y rey contra rey: el mate está cerca, pero hay que elegir con cuidado.",
    finalNote:
      "Con ventaja enorme, comprueba que el rival conserve alguna jugada legal.",
  },
  {
    id: "smothered-mate-lesson",
    title: "Mate de la coz",
    level: "avanzado",
    goal: "mate",
    placement: "5r1k/6pp/4Q2N/8/8/8/8/1K6",
    turn: "w",
    script: [
      { san: "Qg8+", comment: "Sacrificio de dama para atraer a la torre." },
      { san: "Rxg8", comment: "Recaptura forzada." },
      { san: "Nf7#", comment: "¡Mate de la coz! El caballo remata la posición." },
    ],
    startNote: "Dama y caballo cerca del rey negro: busca la combinación.",
    finalNote: "Sacrificio en g8, recaptura forzada y Nf7#.",
  },
];

export const VALID_ENDGAMES: EndgameLesson[] = ENDGAME_LESSONS.filter(
  (l) => buildEndgameState(l, l.script.length).ok
);
