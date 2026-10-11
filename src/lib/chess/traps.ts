// Classic opening traps with didactic comments.

import { LearningLevel, PlayableLine, validateLine } from "./openings";

export interface Trap extends PlayableLine {
  id: string;
  name: string;
  eco?: string;
  level: LearningLevel;
  victim: "blancas" | "negras";
  keyPly: number;
  description: string;
  result: string;
}

export const TRAPS: Trap[] = [
  {
    id: "scholars-mate",
    name: "Mate del pastor",
    eco: "C20",
    level: "principiante",
    victim: "negras",
    keyPly: 6,
    description:
      "El mate más famoso contra defensas descuidadas: dama y alfil apuntan juntos a f7.",
    result: "Mate en 4 jugadas. Defensa correcta: 4...g6 o 4...Qe7.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "Bc4", comment: "El alfil apunta a f7." },
      { san: "Nc6", comment: "Desarrollo natural, pero f7 sigue sin defensa extra." },
      { san: "Qh5", comment: "La dama se suma al ataque sobre f7." },
      { san: "Nf6", comment: "El error: no defienden f7." },
      { san: "Qxf7#", comment: "¡Mate! La dama captura f7 apoyada por el alfil." },
    ],
  },
  {
    id: "fools-mate",
    name: "Mate del loco",
    eco: "C20",
    level: "principiante",
    victim: "blancas",
    keyPly: 3,
    description:
      "El mate más rápido posible: dos debilidades propias y la dama negra entra por la diagonal.",
    result: "Nunca muevas f y g a la vez sin desarrollar.",
    moves: [
      { san: "f3", comment: "Debilidad autoinfligida en el flanco rey." },
      { san: "e5", comment: "Las negras ocupan el centro." },
      { san: "g4", comment: "Segundo error: el rey queda al descubierto." },
      { san: "Qh4#", comment: "¡Mate! La dama castiga las dos debilidades." },
    ],
  },
  {
    id: "legals-trap",
    name: "Trampa de Légal",
    eco: "C41",
    level: "intermedio",
    victim: "negras",
    keyPly: 11,
    description:
      "Sacrificio de dama clásico: si las negras aceptan con avidez, sigue un mate inevitable.",
    result: "La famosa trampa de Légal (1750).",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "Nf3", comment: "Ataque a e5." },
      { san: "Nc6", comment: "Defensa del peón." },
      { san: "Bc4", comment: "El alfil apunta a f7." },
      { san: "d6", comment: "Defensa tranquila." },
      { san: "Nc3", comment: "Desarrollo con presión sobre d5." },
      { san: "Bg4", comment: "Clavada incómoda sobre el caballo de f3." },
      { san: "h3", comment: "Las blancas preguntan al alfil." },
      { san: "Bh5", comment: "El alfil mantiene la clavada." },
      { san: "Nxe5", comment: "¡La trampa! Sacrifican la dama." },
      { san: "Bxd1", comment: "Las negras pican: capturan la dama." },
      { san: "Bxf7+", comment: "Jaque: el alfil está protegido por el caballo." },
      { san: "Ke7", comment: "Forzada: el rey no puede capturar." },
      { san: "Nd5#", comment: "¡Mate! El caballo remata la red." },
    ],
  },
  {
    id: "blackburne-gambit",
    name: "Gambito Blackburne",
    eco: "C50",
    level: "intermedio",
    victim: "blancas",
    keyPly: 8,
    description:
      "Una celada contra el ataque italiano: si las blancas capturan e5 con avidez, el ataque negro es demoledor.",
    result: "Contra 3...Nd4 lo correcto es Nxd4 o enrocar; nunca Nxe5.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "Nf3", comment: "Ataque a e5." },
      { san: "Nc6", comment: "Defensa natural." },
      { san: "Bc4", comment: "El alfil apunta a f7." },
      { san: "Nd4", comment: "Celada: el caballo provoca a las blancas." },
      { san: "Nxe5", comment: "El error: capturan el peón." },
      { san: "Qg5", comment: "¡La clave! La dama ataca g2 y el caballo de e5." },
      { san: "Nxf7", comment: "Las blancas intentan contraatacar." },
      { san: "Qxg2", comment: "La dama castiga: captura g2." },
      { san: "Rf1", comment: "Las blancas salvan la torre." },
      { san: "Qxe4+", comment: "Jaque central y peón recuperado." },
      { san: "Be2", comment: "Bloqueo defensivo." },
      { san: "Nf3#", comment: "¡Mate! El caballo ahoga al rey blanco." },
    ],
  },
  {
    id: "owens-mate",
    name: "Mate de Owen",
    eco: "B00",
    level: "avanzado",
    victim: "negras",
    keyPly: 12,
    description:
      "La trampa de Owen: el alfil de g2 capturado con avidez abre la diagonal hacia un rey indefenso.",
    result: "Castiga 5...f5?! y 6...Nf6?.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "b6", comment: "Defensa descuidada." },
      { san: "d4", comment: "Las blancas ocupan el centro." },
      { san: "Bb7", comment: "El alfil se sitúa en la gran diagonal." },
      { san: "Bd3", comment: "Las blancas preparan el ataque relámpago." },
      { san: "f5", comment: "Las negras debilitan su rey." },
      { san: "exf5", comment: "Capturan al paso." },
      { san: "Bxg2", comment: "El alfil captura g2 con avidez." },
      { san: "Qh5+", comment: "¡Jaque! La dama entra por la diagonal debilitada." },
      { san: "g6", comment: "Bloqueo forzado." },
      { san: "fxg6", comment: "Capturan y mantienen la presión." },
      { san: "Nf6", comment: "El error decisivo: desatienden la diagonal." },
      { san: "gxh7+", comment: "¡Jaque! El peón abre la diagonal de la dama." },
      { san: "Nxh5", comment: "Capturan la dama... demasiado tarde." },
      { san: "Bg6#", comment: "¡Mate! El alfil remata la posición." },
    ],
  },
  {
    id: "damiano-defense",
    name: "Defensa Damiano",
    eco: "C40",
    level: "intermedio",
    victim: "negras",
    keyPly: 5,
    description:
      "Contra la defensa ...f6: la captura en e5 inicia una cacería del rey negro por todo el tablero.",
    result: "El rey negro queda condenado a caminar; nunca juegues ...f6.",
    moves: [
      { san: "e4", comment: "Centro clásico." },
      { san: "e5", comment: "Respuesta simétrica." },
      { san: "Nf3", comment: "Ataque a e5." },
      { san: "f6", comment: "¡Defensa Damiano! Debilita el rey." },
      { san: "Nxe5", comment: "¡La trampa! Sacrifican el caballo." },
      { san: "fxe5", comment: "Las negras aceptan." },
      { san: "Qh5+", comment: "¡Jaque! La dama entra por la diagonal abierta." },
      { san: "Ke7", comment: "El rey debe moverse." },
      { san: "Qxe5+", comment: "La dama recupera el peón con jaque." },
      { san: "Kf7", comment: "El rey sigue huyendo." },
      { san: "Bc4+", comment: "¡Jaque! El alfil se une al acoso." },
      { san: "Kg6", comment: "El rey se interna en territorio enemigo." },
      { san: "Qf5+", comment: "¡Jaque! Se estrecha el cerco." },
      { san: "Kh6", comment: "El rey busca refugio." },
      { san: "d4+", comment: "¡Jaque! El alfil de c1 abre su diagonal." },
      { san: "g5", comment: "Los peones intentan tapar la red." },
      { san: "h4", comment: "Golpe final a la cadena de peones." },
      { san: "Kg7", comment: "El rey escapa hacia el centro... provisionalmente." },
    ],
  },
];

export const VALID_TRAPS: Trap[] = TRAPS.filter((t) => validateLine(t).ok);
