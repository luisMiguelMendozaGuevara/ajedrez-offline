// Opening tutorial data: famous chess openings with explanatory moves.
import { buildStateFromSans as _unused } from "./puzzles";
import { applyMove, generateLegalMoves, initialState, isInCheck } from "./engine";
import { GameState, Move } from "./types";

export interface OpeningMove {
  san: string;
  // explanation shown to the learner for THIS move
  comment: string;
}

export interface Opening {
  id: string;
  name: string;
  eco: string; // ECO code
  description: string;
  moves: OpeningMove[];
}

// Build the state at a given ply (half-move index) by replaying moves.
export function buildOpeningState(opening: Opening, ply: number): {
  state: GameState;
  ok: boolean;
} {
  let state = initialState();
  for (let i = 0; i < ply && i < opening.moves.length; i++) {
    const san = opening.moves[i].san.replace(/[+#]$/, "");
    const legal = generateLegalMoves(state);
    const move = matchSan(state, san, legal);
    if (!move) return { state, ok: false };
    state = applyMove(state, move);
  }
  return { state, ok: true };
}

export function sanToMove(state: GameState, sanRaw: string): Move | null {
  const san = sanRaw.replace(/[+#]$/, "");
  const legal = generateLegalMoves(state);
  return matchSan(state, san, legal);
}

function matchSan(state: GameState, sanRaw: string, legal: Move[]): Move | null {
  const san = sanRaw.replace(/[+#]$/, "").replace(/e\.p\.?$/i, "");
  if (san === "O-O" || san === "0-0")
    return legal.find((m) => m.isCastle === "k") ?? null;
  if (san === "O-O-O" || san === "0-0-0")
    return legal.find((m) => m.isCastle === "q") ?? null;

  let promotion: string | null = null;
  let core = san;
  const promoMatch = core.match(/=([QRBN])$/i);
  if (promoMatch) {
    promotion = promoMatch[1].toLowerCase();
    core = core.slice(0, -2);
  }

  let piece = "p";
  if (/^[KNBQR]/.test(core)) {
    piece = core[0].toLowerCase();
    core = core.slice(1);
  }

  const capture = core.includes("x");
  core = core.replace("x", "");
  if (core.length < 2) return null;
  const toAlg = core.slice(-2);
  const toCol = toAlg.charCodeAt(0) - "a".charCodeAt(0);
  const toRow = 8 - parseInt(toAlg[1], 10);
  if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return null;

  const disamb = core.slice(0, -2);
  let fromCol: number | null = null;
  let fromRow: number | null = null;
  for (const ch of disamb) {
    if (/[a-h]/.test(ch)) fromCol = ch.charCodeAt(0) - "a".charCodeAt(0);
    else if (/[1-8]/.test(ch)) fromRow = 8 - parseInt(ch, 10);
  }

  return (
    legal.find((m) => {
      if (m.piece !== piece) return false;
      if (m.to.row !== toRow || m.to.col !== toCol) return false;
      if (fromCol !== null && m.from.col !== fromCol) return false;
      if (fromRow !== null && m.from.row !== fromRow) return false;
      if (promotion) {
        if (m.promotion !== promotion) return false;
      } else {
        if (m.promotion) return false;
      }
      return true;
    }) ?? null
  );
}

export const OPENINGS: Opening[] = [
  {
    id: "ruy-lopez",
    name: "Ruy López (Española)",
    eco: "C60",
    description:
      "Una de las aperturas más antiguas y estudiadas. Las blancas desarrollan el alfil para presionar el caballo defensor de e5, amenazando indirectamente el peón f7.",
    moves: [
      { san: "e4", comment: "Las blancas ocupan el centro con el peón rey." },
      { san: "e5", comment: "Las negras contestan ocupando el centro simétricamente." },
      { san: "Nf3", comment: "El caballo ataca el peón de e5 y desarrolla una pieza menor." },
      { san: "Nc6", comment: "Las negras defienden e5 con el caballo dama." },
      {
        san: "Bb5",
        comment:
          "¡Jugada clave! El alfil ataca el caballo defensor de e5. Es la Ruy López.",
      },
      { san: "a6", comment: "Variante Morphy: las negras 'preguntan' al alfil qué hará." },
      {
        san: "Ba4",
        comment: "El alfil retrocede manteniendo la tensión sobre c6.",
      },
      { san: "Nf6", comment: "Las negras desarrollan y amenazan e4." },
      { san: "O-O", comment: "Las blancas enrocan y defienden e4 con la torre." },
      { san: "Be7", comment: "Las negras preparan su enroque corto." },
      {
        san: "Re1",
        comment: "Apoyo extra a e4. Posición clásica de la Ruy López cerrada.",
      },
      { san: "b5", comment: "Las negras ganan espacio en el flanco dama y expulsan al alfil." },
    ],
  },
  {
    id: "italian",
    name: "Apertura Italiana (Giuoco Piano)",
    eco: "C50",
    description:
      "Apertura clásica donde las blancas desarrollan el alfil a c4 apuntando al punto débil f7. Equilibrada y didáctica para principiantes.",
    moves: [
      { san: "e4", comment: "Centro clásico con el peón rey." },
      { san: "e5", comment: "Las negrasimitan la jugada." },
      { san: "Nf3", comment: "Ataque sobre e5." },
      { san: "Nc6", comment: "Defensa del peón con el caballo." },
      {
        san: "Bc4",
        comment:
          "El alfil apunta a f7, el punto más débil de las negras al inicio.",
      },
      { san: "Bc5", comment: "Simetría: las negras amenazan f2 simétricamente." },
      { san: "c3", comment: "Las blancas preparan d4 para ganar el centro." },
      { san: "Nf6", comment: "Desarrollo del cabillo rey con ataque a e4." },
      { san: "d4", comment: "Las blancas desafían el centro." },
      { san: "exd4", comment: "Captura central." },
    ],
  },
  {
    id: "sicilian",
    name: "Defensa Siciliana",
    eco: "B20",
    description:
      "La respuesta más popular contra 1.e4. Las negras no imitan, sino que crean asimetría para jugar al desequilibrio y contragolpear en el flanco dama.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      {
        san: "c5",
        comment:
          "¡Siciliana! Las negras luchan por el centro desde el flanco, asimétricamente.",
      },
      { san: "Nf3", comment: "Desarrollo preparando d4." },
      { san: "d6", comment: "Las negras apoyan c5 y abren paso al alfil de casillas negras." },
      { san: "d4", comment: "Las blancas rompen el centro." },
      { san: "cxd4", comment: "Captura asimétrica: el peón negro va al centro." },
      { san: "Nxd4", comment: "El caballo recupera el peón central." },
      { san: "Nf6", comment: "Las negras desarrollan atacando e4." },
      {
        san: "Nc3",
        comment: "Defiende e4. Posición típica de la Siciliana Abierta.",
      },
    ],
  },
  {
    id: "queens-gambit",
    name: "Gambito de Dama",
    eco: "D06",
    description:
      "Las blancas ofrecen un peón lateral para dominar el centro. Aceptarlo no es fácil porque las negras pierden control central.",
    moves: [
      { san: "d4", comment: "Las blancas ocupan el centro con el peón dama." },
      { san: "d5", comment: "Las negras responden simétricamente." },
      {
        san: "c4",
        comment:
          "¡Gambito de Dama! Las blancas ofrecen un peón para controlar el centro.",
      },
      { san: "e6", comment: "Gambito de Dama Rechazado: las negras consolidan sin capturar." },
      { san: "Nc3", comment: "Desarrollo del caballo y refuerzo de d4/c4." },
      { san: "Nf6", comment: "Las negras desarrollan y presionan e4." },
      { san: "Bg5", comment: "El alfil clava el caballo f6 que defiende d5." },
      { san: "Be7", comment: "Las negras rompen la clavada y preparan enroque." },
      { san: "e3", comment: "Las blancas aseguran el centro y abren paso al alfil dama." },
      { san: "O-O", comment: "Enroque seguro para las negras." },
    ],
  },
  {
    id: "french",
    name: "Defensa Francesa",
    eco: "C00",
    description:
      "Defensa sólida y estratégica. Las negras ceden el centro para luego atacarlo con c5 y exd5. Estructura de peones típica con peón rey atrasado.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e6", comment: "¡Francesa! Las negras preparan d5 para romper el centro." },
      { san: "d4", comment: "Las blancas ocupan el centro." },
      { san: "d5", comment: "Las negras desafían el peón rey blanco." },
      { san: "Nc3", comment: "Defiende e4 y desarrolla." },
      { san: "Nf6", comment: "Las negras atacan e4 con el caballo." },
      { san: "e5", comment: "Las blancas ganan espacio y empujan al caballo f6." },
      { san: "fd7", comment: "Retirada del caballo, típica de la variante Steinitz." },
      { san: "f4", comment: "Las blancas ganan más espacio en el flanco rey." },
      { san: "c5", comment: "Las negras atacan d4, el objetivo temático contra el centro blanco." },
    ],
  },
  {
    id: "caro-kann",
    name: "Defensa Caro-Kann",
    eco: "B10",
    description:
      "Defensa sólida y moderna. Las negras preparan d5 sin debilitar el peón e6, a diferencia de la Francesa. Estructura robusta y difícil de atacar.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "c6", comment: "¡Caro-Kann! Las negras preparan d5 con base sólida." },
      { san: "d4", comment: "Las blancas toman el centro." },
      { san: "d5", comment: "Las negras atacan e4 con el peón dama." },
      { san: "Nc3", comment: "Defiende e4." },
      { san: "dxe4", comment: "Las negras capturan para abrir la columna d y activar el alfil." },
      { san: "Nxe4", comment: "El caballo recupera el peón." },
      { san: "Bf5", comment: "Desarrollo activo del alfil antes de enrocar — clave de la Caro-Kann." },
      { san: "Ng3", comment: "El caballo ataca el alfil." },
      { san: "Bg6", comment: "El alfil retrocede pero sigue activo por la gran diagonal." },
      { san: "h4", comment: "Las blancas ganan espacio en el flanco rey." },
      { san: "h6", comment: "Las negras evitan Ng5." },
    ],
  },
  {
    id: "english",
    name: "Apertura Inglesa",
    eco: "A20",
    description:
      "Las blancas abren por el flanco con c4 en lugar de ocupar el centro directamente. Flexible y transposicional, popular en alto nivel.",
    moves: [
      { san: "c4", comment: "¡Apertura Inglesa! Control lateral del centro desde c4." },
      { san: "e5", comment: "Las negras responden ocupando el centro." },
      { san: "Nc3", comment: "Desarrollo del caballo y refuerzo de c4/d5." },
      { san: "Nf6", comment: "Las negras desarrollan presionando e4." },
      { san: "Nf3", comment: "Desarrollo del caballo rey." },
      { san: "Nc6", comment: "Las negras completan el desarrollo menor." },
      { san: "g3", comment: "Las blancas preparan el fianchetto del alfil (Bg2)." },
      { san: "Bb4", comment: "Clavada sobre el caballo c3, típica de la Inglesa." },
      { san: "Bg2", comment: "El alfil apunta a la gran diagonal a1-h8." },
      { san: "e5", comment: "Las negras ganan espacio en el centro." },
    ],
  },
  {
    id: "pirc",
    name: "Defensa Pirc/Moderna",
    eco: "B07",
    description:
      "Defensa hipermoderna: las negras dejan que las blancas construyan un gran centro de peones para luego atacarlo con piezas. Requiere comprensión posicional.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "d6", comment: "¡Pirc! Las negras permiten que las blancas ocupen el centro." },
      { san: "d4", comment: "Las blancas toman el centro." },
      { san: "Nf6", comment: "Las negras atacan e4 con el caballo." },
      { san: "Nc3", comment: "Defiende e4 y desarrolla." },
      { san: "g6", comment: "Las negras preparan el fianchetto del alfil (Bg7)." },
      { san: "Nf3", comment: "Desarrollo del caballo rey." },
      { san: "Bg7", comment: "El alfil apunta a la gran diagonal hacia el centro blanco." },
      { san: "Be2", comment: "Desarrollo del alfil rey blanco." },
      { san: "O-O", comment: "Enroque de las negras, posición hipermoderna típica." },
    ],
  },
];

void _unused;
void isInCheck;
