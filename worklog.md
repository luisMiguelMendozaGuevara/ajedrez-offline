# Worklog - Ajedrez Móvil Gratis

---
Task ID: 1-9
Agent: Z.ai Code (main)
Task: Crear un ajedrez gratuito para móviles con juego contra la máquina (IA) y multijugador offline.

Work Log:
- Analizado el proyecto Next.js 16 existente (TypeScript, Tailwind 4, shadcn/ui, Zustand).
- Diseñada arquitectura en capas: motor de ajedrez → IA → hook de estado → componentes UI.
- Creado `src/lib/chess/types.ts` con tipos (Piece, Board, Move, GameState, GameMode, valores, símbolos Unicode).
- Creado `src/lib/chess/engine.ts` con motor completo:
  - Generación de movimientos pseudo-legales para las 6 piezas.
  - Movimientos especiales: en passant, enroque (con validación de casillas atacadas), promoción de peón.
  - Detección de jaque, jaque mate, ahogado, tablas (regla 50 movimientos, material insuficiente).
  - applyMove inmutable, generateLegalMoves, getStatus.
- Creado `src/lib/chess/ai.ts` con IA minimax + poda alfa-beta:
  - Tablas piece-square (PST) para evaluación posicional.
  - 3 niveles: Fácil (aleatorio ponderado), Medio (depth 2), Difícil (depth 3).
  - Ordenación de movimientos (MVV-LVA) para mejorar poda.
- Creado `src/lib/chess/notation.ts` para notación algebraica estándar (SAN) con desambiguación y símbolos +/#.
- Creado `src/hooks/useChessGame.ts` con Zustand: estado global del juego, selección de casillas, promoción, deshacer (2 plies en modo IA), rendirse, girar tablero, disparo automático de la IA.
- Creados componentes UI en `src/components/chess/`:
  - ChessPiece (piezas Unicode con trazo/sombra para blanco/negro).
  - ChessBoard (tablero 8x8 con coordenadas, resaltado de movimiento legal, último movimiento, jaque, selección).
  - PlayerBar (info de jugador con icono, piezas capturadas, ventaja de material, indicador de turno).
  - CapturedPieces (piezas capturadas con ventaja numérica).
  - MoveHistory (historial SAN en pares, con ScrollArea).
  - PromotionDialog (selección de pieza para promoción).
  - GameControls (Deshacer, Girar, Rendirse con confirmación, Nueva partida).
  - GameOverDialog (modal de fin con animaciones según resultado).
  - GameSetup (selección de modo vs IA / 2 jugadores, dificultad, color).
  - ChessLogo (SVG de caballo de ajedrez).
- Creado `src/components/theme-provider.tsx` (next-themes) y actualizado layout.tsx con metadata en español, viewport móvil, themeColor.
- Construida página principal `src/app/page.tsx`: pantalla de inicio con hero banner, pantalla de juego con barras de jugador, tablero, controles e historial (Sheet en móvil, panel en desktop), header con toggle de tema, footer sticky.
- Corregidos errores de lint (set-state-in-effect, as const, clases Tailwind inválidas h-4.5).
- Ajustado tamaño del tablero con `min(92vw, 540px, 62vh)` para que quepa en cualquier viewport.

Stage Summary:
- Motor de ajedrez completo y verificado: todas las reglas (enroque, en passant, promoción, jaque/mate/ahogado/tablas) funcionan.
- IA con 3 niveles operativa (respondió con Nc6 tras e4 en pruebas).
- Modos de juego: vs Máquina (Fácil/Medio/Difícil, color elegible) y 2 Jugadores offline (pass-and-play con giro de tablero).
- Diseño mobile-first calificado 10/10 por VLM: tablero completo, barras de jugador, botones e historial todos visibles sin recortes en viewport 390x844.
- Verificado end-to-end con agent-browser: inicio de partida, movimiento e2-e4, respuesta de IA, deshacer (reversión correcta de 2 plies), apertura de historial.
- Lint limpio (0 errores). Sin errores en runtime.
- Artefactos: motor (`src/lib/chess/`), hook (`src/hooks/useChessGame.ts`), 9 componentes UI (`src/components/chess/`), página (`src/app/page.tsx`), theme provider.
