// Basic chess rules explained from scratch (Spanish), for the Learn section.
import { PieceType } from "@/lib/chess/types";
import type { MiniBoardMark } from "@/components/chess/MiniBoard";

export type RuleGroup = "básico" | "piezas" | "especiales" | "esencial";

export const RULE_GROUP_LABELS: Record<RuleGroup, string> = {
  "básico": "Básico",
  piezas: "Piezas",
  especiales: "Especial",
  esencial: "Esencial",
};

export interface RuleDiagram {
  placement: string; // FEN placement field (row 0 = rank 8)
  marks?: MiniBoardMark[];
  caption?: string;
}

export interface RuleCard {
  id: string;
  title: string;
  emoji: string;
  group: RuleGroup;
  summary: string;
  points: string[];
  piece?: PieceType; // shows the piece artwork in the card
  diagram?: RuleDiagram; // illustrative mini board shown when expanded
}

export const RULES: RuleCard[] = [
  {
    id: "tablero",
    title: "El tablero y la partida",
    emoji: "🗺️",
    group: "básico",
    summary:
      "El ajedrez se juega en un tablero de 64 casillas (8×8), entre dos jugadores: blancas y negras.",
    points: [
      "Las columnas se llaman a, b, c, d, e, f, g, h y las filas 1 a 8.",
      "Cada jugador empieza con 16 piezas: 8 peones, 2 caballos, 2 alfiles, 2 torres, 1 dama y 1 rey.",
      "La dama empieza en su color (dama blanca en casilla clara, negra en oscura).",
      "Siempre empiezan las blancas, y después se juega por turnos alternos.",
      "Gana quien da jaque mate al rey rival. Si nadie puede, la partida son tablas.",
    ],
    diagram: {
      placement: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
      marks: [],
      caption: "La posición inicial: 8×8, blancas abajo",
    },
  },
  {
    id: "objetivo",
    title: "Jaque y jaque mate",
    emoji: "🎯",
    group: "básico",
    summary:
      "El rey no se captura: cuando está atacado se dice que está en jaque y hay que resolverlo obligatoriamente.",
    points: [
      "Jaque: el rey está atacado. Debes moverlo, bloquear el ataque o capturar la pieza atacante.",
      "No puedes hacer una jugada que deje tu propio rey en jaque.",
      "Jaque mate: el rey está atacado y no hay ninguna forma de salvarlo. La partida termina y ganas.",
      "Ahogado: el jugador al que le toca no está en jaque pero no tiene jugadas legales. Es tablas.",
    ],
    diagram: {
      placement: "6k1/5ppp/8/8/8/8/8/4R1K1",
      marks: [
        { sq: "e8", kind: "ok" },
        { sq: "g8", kind: "danger" },
      ],
      caption: "Jaque mate: la torre entra y el rey no tiene escapatoria",
    },
  },
  {
    id: "peon",
    title: "El peón",
    emoji: "♟️",
    group: "piezas",
    piece: "p",
    summary:
      "Avanza siempre hacia adelante y captura en diagonal. Es la pieza más humilde pero puede coronar.",
    points: [
      "Avanza 1 casilla hacia adelante; desde su casilla inicial puede avanzar 2 de una vez.",
      "Captura en diagonal hacia adelante (nunca de frente) y jamás retrocede.",
      "Si llega a la última fila, se corona: se convierte en dama, torre, alfil o caballo.",
      "Dos peones en la misma columna se llaman 'doblados' y suelen ser una debilidad.",
    ],
    diagram: {
      placement: "8/8/8/8/8/4P3/8/8",
      marks: [
        { sq: "e4", kind: "move" },
        { sq: "d4", kind: "capture" },
        { sq: "f4", kind: "capture" },
      ],
      caption: "Avanza recto (e4) y captura en diagonal (d4/f4)",
    },
  },
  {
    id: "caballo",
    title: "El caballo",
    emoji: "🐴",
    group: "piezas",
    piece: "n",
    summary:
      "Se mueve en 'L': dos casillas en una dirección y una perpendicular. Es la única pieza que salta.",
    points: [
      "Desde e4 puede ir a d6, f6, c5, g5, c3, g3, d2 y f2.",
      "Salta por encima de cualquier pieza, propia o rival.",
      "Vale más en el centro: en una esquina solo controla 2 casillas.",
      "Es ideal para dar 'horquillas': atacar dos piezas a la vez.",
    ],
    diagram: {
      placement: "8/8/8/8/4N3/8/8/8",
      marks: [
        { sq: "d6", kind: "move" },
        { sq: "f6", kind: "move" },
        { sq: "c5", kind: "move" },
        { sq: "g5", kind: "move" },
        { sq: "c3", kind: "move" },
        { sq: "g3", kind: "move" },
        { sq: "d2", kind: "move" },
        { sq: "f2", kind: "move" },
      ],
      caption: "El caballo en el centro salta a 8 casillas",
    },
  },
  {
    id: "alfil",
    title: "El alfil",
    emoji: "⛪",
    group: "piezas",
    piece: "b",
    summary:
      "Se mueve en diagonal cualquier número de casillas. Cada alfil vive en un solo color de casilla.",
    points: [
      "Se mueve por diagonales, sin saltar piezas.",
      "El alfil que empieza en casilla clara siempre estará en casillas claras (y el otro en oscuras).",
      "Por eso se dice que 'el par de alfiles' es una gran ventaja: cubren ambos colores.",
      "Los alfiles necesitan diagonales abiertas para ser fuertes.",
    ],
    diagram: {
      placement: "8/8/8/3B4/8/8/8/8",
      marks: [
        { sq: "a8", kind: "move" },
        { sq: "b7", kind: "move" },
        { sq: "c6", kind: "move" },
        { sq: "e4", kind: "move" },
        { sq: "f3", kind: "move" },
        { sq: "g2", kind: "move" },
        { sq: "h1", kind: "move" },
        { sq: "a2", kind: "move" },
        { sq: "b3", kind: "move" },
        { sq: "c4", kind: "move" },
        { sq: "e6", kind: "move" },
        { sq: "f7", kind: "move" },
        { sq: "g8", kind: "move" },
      ],
      caption: "El alfil solo pisa un color",
    },
  },
  {
    id: "torre",
    title: "La torre",
    emoji: "🏰",
    group: "piezas",
    piece: "r",
    summary:
      "Se mueve en línea recta: cualquier número de casillas por filas o columnas, sin saltar.",
    points: [
      "Domina columnas y filas: colócalas en columnas abiertas.",
      "Con dos torres conectadas (sin piezas entre ellas) forman una pareja temible.",
      "En el final su valor crece mucho: 'las torres pertenecen a las columnas abiertas'.",
      "Junto al rey dan el mate de escalera empujando al rey rival al borde.",
    ],
    diagram: {
      placement: "8/8/8/3R4/8/8/8/8",
      marks: [
        { sq: "d1", kind: "move" },
        { sq: "d2", kind: "move" },
        { sq: "d3", kind: "move" },
        { sq: "d4", kind: "move" },
        { sq: "d6", kind: "move" },
        { sq: "d7", kind: "move" },
        { sq: "d8", kind: "move" },
        { sq: "a5", kind: "move" },
        { sq: "b5", kind: "move" },
        { sq: "c5", kind: "move" },
        { sq: "e5", kind: "move" },
        { sq: "f5", kind: "move" },
        { sq: "g5", kind: "move" },
        { sq: "h5", kind: "move" },
      ],
      caption: "La torre domina filas y columnas",
    },
  },
  {
    id: "dama",
    title: "La dama",
    emoji: "👸",
    group: "piezas",
    piece: "q",
    summary:
      "La pieza más poderosa: combina los movimientos de la torre y del alfil.",
    points: [
      "Se mueve por filas, columnas y diagonales, sin saltar piezas.",
      "Vale unas 9 unidades (peón = 1): perderla sin compensación casi siempre decide la partida.",
      "No la saques demasiado pronto en la apertura: puede ser perseguida y perder tiempo.",
      "Con la dama y tu rey puedes dar mate a un rey solo: úsala para encerrarlo.",
    ],
    diagram: {
      placement: "8/8/8/3Q4/8/8/8/8",
      marks: [
        { sq: "d1", kind: "move" },
        { sq: "d2", kind: "move" },
        { sq: "d3", kind: "move" },
        { sq: "d4", kind: "move" },
        { sq: "d6", kind: "move" },
        { sq: "d7", kind: "move" },
        { sq: "d8", kind: "move" },
        { sq: "a5", kind: "move" },
        { sq: "b5", kind: "move" },
        { sq: "c5", kind: "move" },
        { sq: "e5", kind: "move" },
        { sq: "f5", kind: "move" },
        { sq: "g5", kind: "move" },
        { sq: "h5", kind: "move" },
        { sq: "a8", kind: "move" },
        { sq: "b7", kind: "move" },
        { sq: "c6", kind: "move" },
        { sq: "e4", kind: "move" },
        { sq: "f3", kind: "move" },
        { sq: "g2", kind: "move" },
        { sq: "h1", kind: "move" },
        { sq: "a2", kind: "move" },
        { sq: "b3", kind: "move" },
        { sq: "c4", kind: "move" },
        { sq: "e6", kind: "move" },
        { sq: "f7", kind: "move" },
        { sq: "g8", kind: "move" },
      ],
      caption: "La dama combina torre y alfil",
    },
  },
  {
    id: "rey",
    title: "El rey",
    emoji: "🤴",
    group: "piezas",
    piece: "k",
    summary:
      "Se mueve 1 casilla en cualquier dirección. Es la pieza que hay que proteger: si cae, pierdes.",
    points: [
      "Nunca puede moverse a una casilla atacada por el rival.",
      "No puede estar junto al rey rival (hay que dejar al menos una casilla entre ellos).",
      "En la apertura es frágil: protégelo enrocando.",
      "En el final se vuelve una pieza fuerte: sale a apoyar peones y dar mate.",
    ],
    diagram: {
      placement: "8/8/8/8/4K3/8/8/8",
      marks: [
        { sq: "d3", kind: "move" },
        { sq: "d4", kind: "move" },
        { sq: "d5", kind: "move" },
        { sq: "e3", kind: "move" },
        { sq: "e5", kind: "move" },
        { sq: "f3", kind: "move" },
        { sq: "f4", kind: "move" },
        { sq: "f5", kind: "move" },
      ],
      caption: "El rey mueve 1 casilla en cualquier dirección",
    },
  },
  {
    id: "enroque",
    title: "Regla especial: el enroque",
    emoji: "🏯",
    group: "especiales",
    summary:
      "El rey y la torre se mueven juntos: es la única jugada en la que se mueven dos piezas a la vez.",
    points: [
      "Corto: O-O (rey a g1 y torre a f1). Largo: O-O-O (rey a c1 y torre a d1).",
      "Requisitos: ni el rey ni esa torre se han movido antes.",
      "No puede haber piezas entre el rey y la torre.",
      "El rey no puede estar en jaque, ni pasar por una casilla atacada, ni terminar en jaque.",
      "Enroca pronto: pone tu rey a salvo y conecta las torres.",
    ],
    diagram: {
      placement: "8/8/8/8/8/8/8/4K2R",
      marks: [
        { sq: "g1", kind: "ok" },
        { sq: "f1", kind: "move" },
      ],
      caption: "Enroque corto: rey a g1, torre a f1",
    },
  },
  {
    id: "promocion",
    title: "Regla especial: la coronación",
    emoji: "👑",
    group: "especiales",
    summary:
      "Cuando un peón llega a la última fila, se transforma en otra pieza: casi siempre, una dama.",
    points: [
      "Puedes elegir dama, torre, alfil o caballo (no hay límite de damas).",
      "La elección es inmediata y forma parte de la jugada.",
      "Coronar es uno de los planes más poderosos del final: escolta tu peón con el rey.",
      "¡Cuidado! Si coronas con jaque, el rival debe responder; a veces conviene un caballo para dar mate.",
    ],
    diagram: {
      placement: "8/4P3/8/8/8/8/8/8",
      marks: [{ sq: "e8", kind: "ok" }],
      caption: "Al llegar a la última fila corona",
    },
  },
  {
    id: "alpaso",
    title: "Regla especial: captura al paso",
    emoji: "👣",
    group: "especiales",
    summary:
      "Si un peón rival avanza dos casillas y queda al lado del tuyo, puedes capturarlo como si hubiera avanzado solo una.",
    points: [
      "Solo se puede hacer en la jugada inmediatamente siguiente.",
      "El peón capturado desaparece de la casilla por la que 'pasó'.",
      "Es poco frecuente, pero decide partidas: memoriza cuándo se puede.",
      "En los puzzles y tutoriales verás 'e.p.' cuando ocurre.",
    ],
    diagram: {
      placement: "8/8/8/3pP3/8/8/8/8",
      marks: [
        { sq: "d6", kind: "capture" },
        { sq: "d5", kind: "target" },
      ],
      caption: "Captura al paso: el peón blanco captura en d6",
    },
  },
  {
    id: "valor",
    title: "El valor de las piezas",
    emoji: "⚖️",
    group: "esencial",
    summary:
      "Para decidir cambios y capturas, se comparan valores aproximados en 'peones'.",
    points: [
      "Peón = 1 · Caballo = 3 · Alfil = 3 · Torre = 5 · Dama = 9.",
      "El rey no tiene valor: no se puede cambiar.",
      "Cambia una pieza por otra de igual o mayor valor; evita entregar dama por torre.",
      "El valor es una guía, no una ley: la posición, la actividad y el rey importan más.",
    ],
  },
  {
    id: "notacion",
    title: "Cómo leer las jugadas",
    emoji: "📖",
    group: "esencial",
    summary:
      "Las partidas se escriben en notación algebraica: cada jugada indica pieza y casilla destino.",
    points: [
      "e4 = el peón va a e4. Nf3 = caballo ('N') a f3. Bc4 = alfil, Rc1 = torre, Qd2 = dama, Kg1 = rey.",
      "x = captura (Nxe5: el caballo captura en e5).",
      "+ = jaque. # = jaque mate.",
      "O-O = enroque corto. O-O-O = enroque largo. e8=Q = el peón corona en dama.",
      "'1.' es la jugada de las blancas y '1...' la respuesta de las negras.",
    ],
    diagram: {
      placement: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR",
      marks: [{ sq: "e4", kind: "ok" }],
      caption: "1.e4: el peón va a e4",
    },
  },
  {
    id: "primeros-pasos",
    title: "Tus primeros movimientos",
    emoji: "🚀",
    group: "esencial",
    summary:
      "Si es tu primera partida, sigue esta receta simple: no necesitas memorizar nada para empezar bien.",
    points: [
      "Ocupa el centro: peones a e4/d4 (o e5/d5 con negras).",
      "Saca caballos y alfiles mirando al centro; no repitas piezas sin motivo.",
      "Enroca pronto para proteger al rey.",
      "No saques la dama en las primeras jugadas ni ataques con una sola pieza.",
      "Antes de mover, pregunta: ¿qué amenaza mi rival? ¿puedo capturar algo gratis?",
    ],
    diagram: {
      placement: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R",
      marks: [
        { sq: "e4", kind: "ok" },
        { sq: "e5", kind: "ok" },
        { sq: "f3", kind: "target" },
      ],
      caption: "Ocupa el centro y saca caballos y alfiles",
    },
  },
];
