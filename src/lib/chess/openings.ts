// Opening tutorial data: famous chess openings with explanatory moves.
import { applyMove, generateLegalMoves, initialState } from "./engine";
import { toSan } from "./notation";
import { GameState, Move } from "./types";

export interface OpeningMove {
  san: string;
  // explanation shown to the learner for THIS move
  comment: string;
}

export type OpeningCategory = "abierta" | "semiabierta" | "cerrada" | "india";

export type LearningLevel = "principiante" | "intermedio" | "avanzado";

export interface PlayableLine {
  moves: OpeningMove[];
}

export interface Opening extends PlayableLine {
  id: string;
  name: string;
  eco: string; // ECO code
  category: OpeningCategory;
  level: LearningLevel;
  description: string;
  ideas: string[]; // 3 key ideas
}

export const OPENING_CATEGORY_LABELS: Record<OpeningCategory, string> = {
  abierta: "Abierta",
  semiabierta: "Semiabierta",
  cerrada: "Cerrada",
  india: "India",
};

export const LEVEL_LABELS: Record<LearningLevel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

// Build the state at a given ply (half-move index) by replaying moves.
export function buildOpeningState(
  line: PlayableLine,
  ply: number
): {
  state: GameState;
  ok: boolean;
} {
  let state = initialState();
  for (let i = 0; i < ply && i < line.moves.length; i++) {
    const legal = generateLegalMoves(state);
    const move = matchSan(state, line.moves[i].san, legal);
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

function normalizeSan(san: string): string {
  return san
    .replace(/[+#]$/, "")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .replace(/e\.p\.?$/i, "");
}

// Replay a line and check both legality and SAN fidelity (disambiguation,
// captures, promotions) against the engine's canonical notation.
export function validateLine(line: PlayableLine): {
  ok: boolean;
  failPly: number;
  mismatches: number[];
} {
  let state = initialState();
  const mismatches: number[] = [];
  for (let i = 0; i < line.moves.length; i++) {
    const legal = generateLegalMoves(state);
    const move = matchSan(state, line.moves[i].san, legal);
    if (!move) return { ok: false, failPly: i, mismatches };
    if (normalizeSan(toSan(state, move)) !== normalizeSan(line.moves[i].san)) {
      mismatches.push(i);
    }
    state = applyMove(state, move);
  }
  return {
    ok: mismatches.length === 0,
    failPly: mismatches.length > 0 ? mismatches[0] : -1,
    mismatches,
  };
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
    category: "abierta",
    level: "intermedio",
    description:
      "Una de las aperturas más antiguas y estudiadas. Las blancas desarrollan el alfil para presionar el caballo defensor de e5, amenazando indirectamente el peón f7.",
    ideas: [
      "Presionar e5 con el alfil para forzar concesiones",
      "Enrocar pronto y reforzar el centro",
      "Jugar d4 en el momento justo para ganar espacio",
    ],
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
    category: "abierta",
    level: "principiante",
    description:
      "Apertura clásica donde las blancas desarrollan el alfil a c4 apuntando al punto débil f7. Equilibrada y didáctica para principiantes.",
    ideas: [
      "Ocupar el centro con e4 y preparar d4",
      "El alfil de c4 vigila f7, el punto débil de las negras",
      "Completar el desarrollo antes de lanzar el ataque",
    ],
    moves: [
      { san: "e4", comment: "Centro clásico con el peón rey." },
      { san: "e5", comment: "Las negras imitan la jugada." },
      { san: "Nf3", comment: "Ataque sobre e5." },
      { san: "Nc6", comment: "Defensa del peón con el caballo." },
      {
        san: "Bc4",
        comment:
          "El alfil apunta a f7, el punto más débil de las negras al inicio.",
      },
      { san: "Bc5", comment: "Simetría: las negras amenazan f2 simétricamente." },
      { san: "c3", comment: "Las blancas preparan d4 para ganar el centro." },
      { san: "Nf6", comment: "Desarrollo del caballo rey con ataque a e4." },
      { san: "d4", comment: "Las blancas desafían el centro." },
      { san: "exd4", comment: "Captura central." },
    ],
  },
  {
    id: "sicilian",
    name: "Defensa Siciliana",
    eco: "B20",
    category: "semiabierta",
    level: "intermedio",
    description:
      "La respuesta más popular contra 1.e4. Las negras no imitan, sino que crean asimetría para jugar al desequilibrio y contragolpear en el flanco dama.",
    ideas: [
      "Las negras evitan la simetría para jugar al desequilibrio",
      "Contragolpear en el flanco dama con c5 y la columna c",
      "Las blancas buscan ataque con d4 y desarrollo rápido",
    ],
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
    category: "cerrada",
    level: "principiante",
    description:
      "Las blancas ofrecen un peón lateral para dominar el centro. Aceptarlo no es fácil porque las negras pierden control central.",
    ideas: [
      "Ofrecer c4 para dominar el centro",
      "Recuperar el peón con calma si se acepta",
      "Presionar d5 con piezas antes de avanzar en el centro",
    ],
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
    category: "semiabierta",
    level: "intermedio",
    description:
      "Defensa sólida y estratégica. Las negras ceden el centro para luego atacarlo con c5 y exd5. Estructura de peones típica con peón rey atrasado.",
    ideas: [
      "Ceder el centro para atacarlo con c5 y d4",
      "Cuidar el alfil de casillas claras, el problema de la Francesa",
      "Atacar siempre la base de la cadena: d4",
    ],
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e6", comment: "¡Francesa! Las negras preparan d5 para romper el centro." },
      { san: "d4", comment: "Las blancas ocupan el centro." },
      { san: "d5", comment: "Las negras desafían el peón rey blanco." },
      { san: "Nc3", comment: "Defiende e4 y desarrolla." },
      { san: "Nf6", comment: "Las negras atacan e4 con el caballo." },
      { san: "e5", comment: "Las blancas ganan espacio y empujan al caballo f6." },
      { san: "Nfd7", comment: "Retirada del caballo, típica de la variante Steinitz." },
      { san: "f4", comment: "Las blancas ganan más espacio en el flanco rey." },
      { san: "c5", comment: "Las negras atacan d4, el objetivo temático contra el centro blanco." },
    ],
  },
  {
    id: "caro-kann",
    name: "Defensa Caro-Kann",
    eco: "B10",
    category: "semiabierta",
    level: "intermedio",
    description:
      "Defensa sólida y moderna. Las negras preparan d5 sin debilitar el peón e6, a diferencia de la Francesa. Estructura robusta y difícil de atacar.",
    ideas: [
      "Preparar d5 con c6 sin debilitar e6",
      "Activar el alfil de c8 a f5 antes de jugar e6",
      "Estructura sólida: aguantar y contraatacar",
    ],
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
    category: "cerrada",
    level: "intermedio",
    description:
      "Las blancas abren por el flanco con c4 en lugar de ocupar el centro directamente. Flexible y transposicional, popular en alto nivel.",
    ideas: [
      "Controlar el centro desde el flanco con c4",
      "Fianchettar el alfil para dominar la gran diagonal",
      "Flexible y transposicional: adaptarse al rival",
    ],
    moves: [
      { san: "c4", comment: "¡Apertura Inglesa! Control lateral del centro desde c4." },
      { san: "e5", comment: "Las negras responden ocupando el centro." },
      { san: "Nc3", comment: "Desarrollo del caballo y refuerzo de c4/d5." },
      { san: "Nf6", comment: "Las negras desarrollan presionando e4." },
      { san: "Nf3", comment: "Desarrollo del caballo rey." },
      { san: "Nc6", comment: "Las negras completan el desarrollo menor." },
      { san: "g3", comment: "Las blancas preparan el fianchetto del alfil (Bg2)." },
      { san: "Bb4", comment: "Clavada sobre el caballo c3, típica de la Inglesa." },
      { san: "Bg2", comment: "El alfil apunta a la gran diagonal a8-h1." },
      { san: "O-O", comment: "Las negras enrocan: rey seguro antes de definir el centro." },
    ],
  },
  {
    id: "pirc",
    name: "Defensa Pirc/Moderna",
    eco: "B07",
    category: "semiabierta",
    level: "avanzado",
    description:
      "Defensa hipermoderna: las negras dejan que las blancas construyan un gran centro de peones para luego atacarlo con piezas. Requiere comprensión posicional.",
    ideas: [
      "Dejar que el rival construya el centro para atacarlo",
      "La gran diagonal del alfil de g7",
      "Golpear el centro con c5 o e5 en el momento justo",
    ],
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
  {
    id: "scotch",
    name: "Apertura Escocesa",
    eco: "C45",
    category: "abierta",
    level: "principiante",
    description:
      "Las blancas abren el centro de inmediato con d4. Juego directo y didáctico para aprender a explotar el centro.",
    ideas: [
      "Ganar espacio central sin demora",
      "Desarrollo rápido y armonioso",
      "La columna b abierta como compensación negra",
    ],
    moves: [
      { san: "e4", comment: "Las blancas ocupan el centro." },
      { san: "e5", comment: "Las negras responden con simetría." },
      { san: "Nf3", comment: "El caballo ataca e5." },
      { san: "Nc6", comment: "Las negras defienden e5." },
      { san: "d4", comment: "¡Escocesa! Las blancas abren el centro de inmediato." },
      { san: "exd4", comment: "Las negras capturan el peón central." },
      { san: "Nxd4", comment: "El caballo recupera y domina el centro." },
      { san: "Nf6", comment: "Las negras se desarrollan presionando e4." },
      { san: "Nc3", comment: "Las blancas defienden e4 y completan el desarrollo menor." },
      { san: "Bb4", comment: "Clavada estilo Mieses sobre el caballo de c3." },
      { san: "Nxc6", comment: "Cambio estratégico: eliminan al defensor de e5." },
      { san: "bxc6", comment: "Peones doblados, pero la columna b queda abierta como compensación." },
      { san: "Bd3", comment: "El alfil apunta a h7 y refuerza el centro." },
      { san: "d5", comment: "¡Contraataque central! Las negras buscan liberarse." },
    ],
  },
  {
    id: "petrov",
    name: "Defensa Petrov",
    eco: "C42",
    category: "abierta",
    level: "intermedio",
    description:
      "Las negras contraatacan e4 desde el primer momento. Simetría, actividad y juego preciso.",
    ideas: [
      "Contraatacar antes que defender pasivamente",
      "Simetría con iniciativa",
      "Neutralizar el caballo de e4",
    ],
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "Nf3", comment: "El caballo ataca e5." },
      { san: "Nf6", comment: "¡Petrov! Las negras contraatacan e4 de inmediato." },
      { san: "Nxe5", comment: "Las blancas aceptan el peón central." },
      { san: "d6", comment: "Las negras expulsan al caballo de e5." },
      { san: "Nf3", comment: "Retirada ordenada del caballo." },
      { san: "Nxe4", comment: "Las negras recuperan: equilibrio y centro." },
      { san: "d4", comment: "Las blancas ocupan el centro." },
      { san: "d5", comment: "Las negras sostienen el caballo y fijan el centro." },
      { san: "Bd3", comment: "El alfil apunta a e4, presionando al caballo." },
      { san: "Be7", comment: "Desarrollo sólido preparando el enroque." },
      { san: "O-O", comment: "Rey seguro: las blancas enrocan." },
      { san: "Nc6", comment: "Las negras completan el desarrollo y presionan d4." },
    ],
  },
  {
    id: "kings-gambit",
    name: "Gambito de Rey",
    eco: "C39",
    category: "abierta",
    level: "avanzado",
    description:
      "El gambito romántico: entregan f para desviar e5 y construir un centro móvil con ataque al rey.",
    ideas: [
      "Compensación = tiempo, centro y líneas abiertas",
      "El rey negro como objetivo",
      "Cálculo táctico constante",
    ],
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "f4", comment: "¡Gambito de Rey! Entregan el peón f para desviar e5." },
      { san: "exf4", comment: "Las negras aceptan el gambito." },
      { san: "Nf3", comment: "Desarrollo con ideas sobre e5 y d4." },
      { san: "g5", comment: "Las negras defienden el peón de f4." },
      { san: "h4", comment: "Golpe directo a la cadena de peones negra." },
      { san: "g4", comment: "Las negras sostienen f4 y alejan al caballo, aunque debilitan su rey." },
      { san: "Ne5", comment: "El caballo ideal: controla el centro y mira a f7." },
      { san: "Nf6", comment: "Las negras se desarrollan atacando e4." },
      { san: "Bc4", comment: "El alfil apunta a f7 y refuerza e5." },
      { san: "d5", comment: "Contraataque central contra las piezas blancas." },
      { san: "exd5", comment: "Las blancas abren la posición." },
      { san: "Bd6", comment: "Desarrollo natural: posición salvaje típica del Gambito de Rey." },
    ],
  },
  {
    id: "scandinavian",
    name: "Defensa Escandinava",
    eco: "B01",
    category: "semiabierta",
    level: "principiante",
    description:
      "Golpe inmediato al centro con d5; la dama sale pronto pero la estructura negra es sólida y fácil.",
    ideas: [
      "Desafío central desde la jugada 1",
      "La dama en a5 como pieza activa",
      "Estructura sin debilidades",
    ],
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "d5", comment: "¡Escandinava! Las negras golpean el centro de inmediato." },
      { san: "exd5", comment: "Las blancas aceptan el peón." },
      { san: "Qxd5", comment: "La dama recupera: activa pero expuesta." },
      { san: "Nc3", comment: "Desarrollo con tempo: el caballo ataca la dama." },
      { san: "Qa5", comment: "La dama se retira a una casilla activa vigilando el centro." },
      { san: "d4", comment: "Las blancas toman el centro con ganancia de tiempo." },
      { san: "Nf6", comment: "Las negras se desarrollan presionando e4." },
      { san: "Nf3", comment: "Control de e5 y desarrollo natural." },
      { san: "c6", comment: "Respiro para la dama y preparación de b5." },
      { san: "Bc4", comment: "El alfil apunta a f7." },
      { san: "Bf5", comment: "Desarrollo activo: el alfil controla e4." },
      { san: "Bd2", comment: "Las blancas conectan las torres." },
      { san: "e6", comment: "Las negras consolidan: posición sólida." },
    ],
  },
  {
    id: "qga",
    name: "Gambito de Dama Aceptado",
    eco: "D20",
    category: "cerrada",
    level: "principiante",
    description:
      "Las negras aceptan c4 y devuelven el centro a cambio de desarrollo cómodo. Equilibrio clásico.",
    ideas: [
      "Recuperar c4 con Bxc4",
      "Expansión b5 como plan negro",
      "c5 contra el centro blanco",
    ],
    moves: [
      { san: "d4", comment: "Centro con el peón dama." },
      { san: "d5", comment: "Respuesta simétrica." },
      { san: "c4", comment: "¡Gambito de Dama! Las blancas ofrecen el peón lateral." },
      { san: "dxc4", comment: "Las negras aceptan el gambito." },
      { san: "Nf3", comment: "Controla e5 y prepara recuperar c4." },
      { san: "Nf6", comment: "Desarrollo natural de las negras." },
      { san: "e3", comment: "Abre paso al alfil para recuperar c4." },
      { san: "e6", comment: "Estructura negra sólida." },
      { san: "Bxc4", comment: "El alfil recupera el peón y apunta a f7." },
      { san: "c5", comment: "Contraataque temático contra d4." },
      { san: "O-O", comment: "Rey blanco seguro." },
      { san: "a6", comment: "Las negras preparan b5." },
      { san: "Qe2", comment: "La dama apoya e4 para ganar espacio." },
      { san: "b5", comment: "Expansión en el flanco dama: ganan espacio." },
    ],
  },
  {
    id: "slav",
    name: "Defensa Eslava",
    eco: "D11",
    category: "cerrada",
    level: "intermedio",
    description:
      "Defensa del Gambito de Dama sin encerrar al alfil de c8: tras c6 y dxc4, el alfil sale por f5.",
    ideas: [
      "c6 defiende d5 sin bloquear c8",
      "Bf5 antes de e6",
      "El peón c4 como objetivo temporal",
    ],
    moves: [
      { san: "d4", comment: "Centro con el peón dama." },
      { san: "d5", comment: "Respuesta simétrica." },
      { san: "c4", comment: "¡Gambito de Dama!" },
      { san: "c6", comment: "¡Eslava! Defienden d5 sin bloquear al alfil de c8." },
      { san: "Nf3", comment: "Control de e5." },
      { san: "Nf6", comment: "Desarrollo natural." },
      { san: "Nc3", comment: "Presión sobre d5." },
      { san: "dxc4", comment: "Las negras capturan c4: el alfil de c8 ya tiene salida." },
      { san: "a4", comment: "Impiden b5 y preparan e4." },
      { san: "Bf5", comment: "El gran logro de la Eslava: el alfil sale activo." },
      { san: "e3", comment: "Las blancas preparan recuperar c4." },
      { san: "e6", comment: "Las negras consolidan." },
      { san: "Bxc4", comment: "El alfil recupera y apunta a f7." },
      { san: "Bb4", comment: "Clavada activa sobre el caballo de c3." },
    ],
  },
  {
    id: "kid",
    name: "India de Rey",
    eco: "E60",
    category: "india",
    level: "avanzado",
    description:
      "Apertura hipermoderna: ceden el centro para atacarlo con piezas y los golpes e5/c5.",
    ideas: [
      "Dejar construir el centro grande y atacarlo",
      "La gran diagonal del alfil g7",
      "Contrajuego con f5",
    ],
    moves: [
      { san: "d4", comment: "Centro con el peón dama." },
      { san: "Nf6", comment: "Las negras controlan e4 sin ocupar el centro." },
      { san: "c4", comment: "Las blancas amplían su centro." },
      { san: "g6", comment: "¡India de Rey! Preparan el fianchetto." },
      { san: "Nc3", comment: "Desarrollo blanco." },
      { san: "Bg7", comment: "El alfil domina la gran diagonal." },
      { san: "e4", comment: "El centro grande blanco está listo." },
      { san: "d6", comment: "Las negras preparan e5 o c5." },
      { san: "Nf3", comment: "Desarrollo blanco." },
      { san: "O-O", comment: "Las negras enrocan antes de definir." },
      { san: "Be2", comment: "Las blancas completan el desarrollo." },
      { san: "e5", comment: "¡Golpe temático! Atacan el centro desde el flanco." },
      { san: "O-O", comment: "Las blancas enrocan." },
      { san: "Nc6", comment: "Las negras presionan d4 y preparan f5 o exd4." },
    ],
  },
  {
    id: "nimzo",
    name: "Defensa Nimzoindia",
    eco: "E20",
    category: "india",
    level: "intermedio",
    description:
      "La joya de las indias: luchan por e4 con piezas y presionan el centro con la clavada Bb4.",
    ideas: [
      "Luchar por e4 sin ocupar el centro",
      "c5 y d5 como contrapesos",
      "Peones doblados blancos como objetivo",
    ],
    moves: [
      { san: "d4", comment: "Centro con el peón dama." },
      { san: "Nf6", comment: "Las negras controlan e4." },
      { san: "c4", comment: "Ampliación del centro blanco." },
      { san: "e6", comment: "Jugada flexible: preparan d5 o Bb4." },
      { san: "Nc3", comment: "Desarrollo blanco." },
      { san: "Bb4", comment: "¡Nimzoindia! La clavada lucha por e4 sin ocupar el centro." },
      { san: "e3", comment: "Las blancas rompen la clavada." },
      { san: "O-O", comment: "Rey negro seguro." },
      { san: "Bd3", comment: "El alfil ocupa la diagonal b1-h7." },
      { san: "d5", comment: "Las negras ocupan el centro." },
      { san: "Nf3", comment: "Las blancas completan el desarrollo." },
      { san: "c5", comment: "Presión inmediata sobre d4." },
      { san: "O-O", comment: "Las blancas enrocan." },
      { san: "Nc6", comment: "Más presión sobre d4: la lucha por el centro es total." },
    ],
  },
];

export const VALID_OPENINGS: Opening[] = OPENINGS.filter(
  (o) => validateLine(o).ok
);
