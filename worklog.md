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

---
Task ID: R1 (cron review)
Agent: Z.ai Code (cron webDevReview)
Task: Revisión QA + añadir funcionalidades y mejorar estilos.

Estado del proyecto al iniciar:
- App de ajedrez mobile-first funcional y estable (vs IA + 2 jugadores offline).
- Motor completo, IA minimax, todos los modos y reglas operativos.

Work Log (Ronda 1 - Mejoras):
- QA con agent-browser (viewport 390x844): servidor, setup, partida, movimiento e2-e4 + respuesta IA (Nc6), deshacer, historial SAN, toggle tema claro/oscuro, flujo de rendición con confirmación → diálogo de fin. Todo sin errores de consola ni en log.
- Creado `src/lib/chess/storage.ts`: persistencia en localStorage de (a) partida en curso, (b) estadísticas (victorias/derrotas/tablas/racha/victoria más rápida), (c) ajustes (tema de tablero, sonido, vibración, coordenadas, resaltado).
- Creado `src/lib/chess/sound.ts`: efectos de sonido con Web Audio API (move/capture/check/castle/select/gameEnd/invalid) sin archivos externos + vibración háptica vía Vibration API.
- Creado `src/hooks/useSettings.ts`: store Zustand para ajustes con hidratación desde localStorage.
- Extendido `src/hooks/useChessGame.ts`:
  - `loadSaved()`: restaura partida guardada tras recarga.
  - `showHint()`/`clearHint()`: sugiere el mejor movimiento (IA medio) con resaltado animado.
  - `hintMove` en estado para resaltado visual.
  - `statsRecorded` para evitar doble conteo.
  - Persistencia automática tras cada movimiento (saveGame) y limpieza al terminar (clearSavedGame).
  - Grabación de estadísticas al acabar partida (win/loss/draw, nº jugadas, vs IA).
  - Sonidos y vibración integrados en makeMove/undo/resign/selectSquare.
- Mejorado `src/components/chess/ChessBoard.tsx`:
  - 5 temas de tablero configurables (Clásico, Esmeralda, Océano, Rosado, Medianoche) vía CSS variables.
  - Toggles de coordenadas y resaltado de último movimiento.
  - Resaltado de pista (hint) con animación pulse degradada celeste.
  - Animación de piezas con framer-motion `layoutId` (movimiento suave).
  - Indicador de "Pensando…" con 3 puntos animados (bounce escalonado).
  - Mejores indicadores de movimiento legal (sombra interior, anillo más fino).
- Creado `src/components/chess/SettingsDialog.tsx`: diálogo completo con secciones de estadísticas (tarjetas animadas), selección de tema de tablero (preview 2x2), 4 toggles con switch animado, y borrado de estadísticas con confirmación.
- Renovado `src/components/chess/GameControls.tsx`: grid de 6 botones (Deshacer, Pista, Girar, Ajustes, Nueva + Rendirse a ancho completo) con iconos y labels, estados activos/deshabilitados.
- Actualizado `src/app/page.tsx`: botón "Continuar partida guardada" en setup si hay partida en curso, botón de ajustes en header, integración de SettingsDialog, toasts (sonner) al restaurar/borrar.
- Añadido SonnerToaster al layout (`position="top-center" richColors closeButton`).
- Corregidos 2 errores de lint (react-hooks/set-state-in-effect en page.tsx y SettingsDialog.tsx con disable inline).

Verificación (Ronda 1):
- Lint limpio (0 errores).
- Setup renderiza, partida inicia, 64 casillas visibles.
- Pista: resalta 2 casillas (from+to) con overlay celeste animado ✓.
- Cambio de tema a Esmeralda aplicado (casilla a1 = rgb(90,138,94)) ✓.
- Ajustes: diálogo abre con estadísticas, 5 temas, 4 toggles ✓.
- Persistencia: tras recarga aparece "Continuar partida guardada"; al pulsar restaura el tablero (peón en e4) y muestra toast "Partida restaurada" ✓.
- VLM califica tema Esmeralda 8/10 (color atractivo, contraste bueno, hint visible, layout lógico).
- Sin errores de consola ni en dev.log.

Stage Summary (Ronda 1):
- Funcionalidades nuevas: persistencia de partida, estadísticas, sugerencia de pista, efectos de sonido, vibración háptica, 5 temas de tablero, diálogo de ajustes completo.
- Mejoras de estilo: animaciones de piezas (layout), indicador de pensamiento con bounce, resaltado de pista pulsante, switches animados, tarjetas de estadísticas animadas, mejores indicadores de movimiento legal.
- Estado: estable, lint limpio, verificado end-to-end con agent-browser + VLM.
- Riesgo: el dev server se detiene entre comandos bash (sesión no persistente); se reinicia con `(setsid bun run dev </dev/null >/dev/null 2>&1 &)`.
- Próximas mejoras recomendadas: reloj/timer de ajedrez, exportar/importar PGN, más niveles de dificultad, tutorial de apertura, modo "ajedrez a la ciega".

---
Task ID: R2 (cron review)
Agent: Z.ai Code (cron webDevReview)
Task: Revisión QA + añadir reloj de ajedrez, PGN, más dificultades, modo a la ciega.

Estado del proyecto al iniciar (R2):
- App estable con: motor completo, IA (fácil/medio/difícil), 2 modos, persistencia, estadísticas, sonidos, 5 temas de tablero, ajustes, pista.
- Lint limpio, sin errores runtime.

Work Log (Ronda 2 - Funcionalidades nuevas):
- QA inicial con agent-browser (viewport 390x844): setup, partida, movimiento, todo OK, sin errores.
- Extendidos tipos en `src/lib/chess/types.ts`:
  - `Difficulty` ahora incluye 5 niveles: `beginner | easy | medium | hard | expert`.
  - `TimeControl` interface (initialSeconds + increment Fischer).
  - `TIME_PRESETS`: 5 controles (Sin tiempo ∞, Bala ⚡ 60s, Relámpago 🔥 3+2, Rápida ⏱ 10+5, Clásica ♟ 30min).
  - `DIFFICULTY_META`: metadata (label, descripción, emoji) para cada nivel.
- Actualizado `src/lib/chess/ai.ts`:
  - `beginner`: movimientos completamente aleatorios legales.
  - `expert`: minimax profundidad 4 (más fuerte que hard=3).
  - Refactorizada función `findBestMove` con `Difficulty` type.
- Creado `src/lib/chess/pgn.ts`:
  - `exportPgn()`: genera PGN completo con cabeceras (Event, Site, Date, White, Black, Result, Mode, Difficulty, TimeControl) y movetext SAN.
  - `importPgn()`: parsea PGN (cabeceras + movetext), maneja enroque (O-O/O-O-O), promociones (=Q), capturas (x), desambiguación, símbolos +/#. Re-emprime los movimientos desde la posición inicial.
  - `headersFromMode()`: construye cabeceras desde GameMode + resultado.
- Extendido `src/hooks/useChessGame.ts`:
  - Estado: `whiteTime`, `blackTime`, `lastTickAt`, `replayMode`.
  - `newGame`: inicializa relojes con timeControl.
  - `makeMove`: descuenta tiempo del jugador que mueve, suma incremento Fischer, detecta pérdida por tiempo.
  - `tickClock()`: decrementa el reloj del jugador en turno cada 250ms; al llegar a 0 → derrota por tiempo + graba stats.
  - `exportPgn()` / `loadPgn()`: acciones para exportar/importar partidas.
  - `loadPgn`: modo repetición (replayMode=true) → desactiva IA, stats y persistencia.
  - Sonidos y vibración saltan en modo repetición.
- Creado `src/components/chess/ChessClock.tsx`:
  - Display monoespaciado con formato m:ss / h:mm:ss.
  - Colores: verde (activo), ámbar (<10s), rojo (agotado).
  - Animación de escala cuando está activo.
  - Se actualiza cada 250ms vía interval + tickClock.
- Actualizado `src/components/chess/PlayerBar.tsx`: integra ChessClock cuando hay timeControl.
- Actualizado `src/components/chess/ChessBoard.tsx`: soporta prop `blindfold` → oculta piezas salvo la casilla seleccionada.
- Renovado `src/components/chess/GameSetup.tsx`:
  - 5 pills de dificultad con emoji + descripción dinámica.
  - 5 pills de control de tiempo.
  - Toggle de Ajedrez a la ciega (switch animado).
  - Botón Importar PGN (input file oculto .pgn/.txt).
- Renovado `src/components/chess/GameControls.tsx`:
  - Botones Exportar PGN (copia al portapapeles o descarga .pgn) y Compartir (Web Share API).
  - Banner de "Modo repetición PGN" cuando replayMode=true.
  - Rendirse deshabilitado en replay.
- Actualizado `src/app/page.tsx`: estado `blindfold`, wiring de handleStart/handleImportPgn, banner de modo a la ciega bajo el tablero.

Verificación (Ronda 2):
- Lint limpio (0 errores).
- Setup renderiza las 5 dificultades (Principiante→Experto), 5 controles de tiempo (Bala, Relámpago...), toggle a la ciega, botón importar PGN ✓.
- Partida con Relámpago (3:00): relojes visibles en PlayerBar, muestran 3:00 ✓.
- PGN export: copia al portapapeles, toast "PGN copiado al portapapeles" ✓.
- PGN import (Ruy Lopez 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6): tablero carga posición final correcta (e4=♟, e5=♟, b5=♟), banner "Modo repetición" visible ✓.
- Modo a la ciega: 0 piezas visibles en el tablero; al tocar e2 aparece el peón ♟; banner "Modo a la ciega activo" visible ✓ (VLM 9/10).
- Experto (depth 4): responde en ~5s con Nc6 tras e4, sin errores ✓.
- VLM setup screen: 8/10 (card-based, mobile-friendly, touch targets grandes).
- VLM blindfold: 9/10 (board vacío, banner claro, controles visibles).
- Sin errores de consola ni en dev.log.

Stage Summary (Ronda 2):
- Funcionalidades nuevas: reloj de ajedrez (5 controles incluyendo Fischer increment), 5 niveles de dificultad (Principiante→Experto), exportar PGN, importar PGN (con parser robusto), modo Ajedrez a la Ciega, compartir partida (Web Share API).
- Mejoras de estilo: pills con emoji para dificultad/tiempo, switches animados, banner informativo de modo a la ciega, banner de modo repetición, clocks con colores semánticos.
- Estado: estable, lint limpio, verificado end-to-end con agent-browser + VLM (8/10 y 9/10).
- Riesgo: expert mode (depth 4) tarda ~5s por movimiento (aceptable pero podría optimizarse con tabla de transposición en el futuro).
- Próximas mejoras recomendadas: tabla de transposición para acelerar expert, tutorial de aperturas con partidas famosas, modo "análisis" con evaluación, notación algebraica explicada, logros/desafíos diarios.
