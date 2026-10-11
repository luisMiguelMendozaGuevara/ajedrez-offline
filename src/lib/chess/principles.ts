// Core chess principles for the learning tab.

export interface PrincipleCard {
  id: string;
  title: string;
  emoji: string;
  category: "apertura" | "medio juego" | "final";
  summary: string;
  points: string[];
  mistake: string;
}

export const PRINCIPLES: PrincipleCard[] = [
  {
    id: "domina-el-centro",
    title: "Domina el centro",
    emoji: "🎯",
    category: "apertura",
    summary:
      "Las piezas valen más en el centro: controlan más casillas y llegan antes a cualquier sector.",
    points: [
      "Peones en e4/d4 controlan más casillas y dan espacio",
      "Desarrolla las piezas hacia el centro",
      "Un centro sólido es la base del ataque",
    ],
    mistake: "Jugar solo en los flancos y regalar el centro.",
  },
  {
    id: "desarrolla-con-proposito",
    title: "Desarrolla con propósito",
    emoji: "♞",
    category: "apertura",
    summary:
      "Saca tus piezas menores hacia casillas activas antes de definir el plan.",
    points: [
      "Caballos y alfiles antes que dama y torres",
      "No muevas la misma pieza dos veces sin ganancia",
      "Desarrolla hacia casillas donde las piezas se ayuden",
    ],
    mistake: "Sacar la dama temprano y que la persigan con tempo.",
  },
  {
    id: "enroca-pronto",
    title: "Enroca pronto",
    emoji: "🏰",
    category: "apertura",
    summary:
      "El rey seguro es una pieza más: enroca en cuanto tengas las piezas menores listas.",
    points: [
      "Enroca cuando las piezas menores estén desarrolladas",
      "No muevas los peones que protegen tu enroque sin motivo",
      "Comprueba clavadas antes de elegir banda",
    ],
    mistake: "Retrasar el enroque 'para atacar primero'.",
  },
  {
    id: "coordina-las-piezas",
    title: "Coordina las piezas",
    emoji: "🤝",
    category: "medio juego",
    summary:
      "Piezas que trabajan juntas valen mucho más que piezas sueltas.",
    points: [
      "Busca piezas que se defiendan entre sí",
      "Antes de atacar cuenta atacantes y defensores",
      "Torres conectadas y desarrollo completo",
    ],
    mistake: "Atacar con una pieza contra dos defensas.",
  },
  {
    id: "cambia-cuando-vas-ganando",
    title: "Cambia cuando vas ganando",
    emoji: "⚖️",
    category: "medio juego",
    summary:
      "Con ventaja material, cada cambio acerca el final que debes ganar.",
    points: [
      "Con ventaja material simplifica",
      "Evita cambios si tienes iniciativa",
      "En el final tu rey es una pieza fuerte",
    ],
    mistake: "Simplificar cuando estás peor.",
  },
  {
    id: "ten-un-plan",
    title: "Ten un plan",
    emoji: "🧭",
    category: "medio juego",
    summary:
      "Cada jugada debe mejorar algo: una pieza, una amenaza o tu estructura.",
    points: [
      "Identifica el punto débil rival",
      "Mejora primero tu peor pieza",
      "Crea dos amenazas a la vez",
    ],
    mistake: "Mover sin plan reaccionando a cada amenaza.",
  },
];
