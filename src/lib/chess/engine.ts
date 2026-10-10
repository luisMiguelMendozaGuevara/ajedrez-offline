import {
  Board,
  CastlingRights,
  GameState,
  Move,
  Piece,
  PieceColor,
  PieceType,
  Square,
} from "./types";

// ---------- Helpers ----------

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function cloneState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
  };
}

export function squareToAlgebraic(sq: Square): string {
  const file = String.fromCharCode("a".charCodeAt(0) + sq.col);
  const rank = 8 - sq.row;
  return `${file}${rank}`;
}

export function algebraicToSquare(s: string): Square {
  const col = s.charCodeAt(0) - "a".charCodeAt(0);
  const row = 8 - parseInt(s[1], 10);
  return { row, col };
}

export function opposite(color: PieceColor): PieceColor {
  return color === "w" ? "b" : "w";
}

// ---------- Initial state ----------

export function initialBoard(): Board {
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: Board = Array.from({ length: 8 }, () =>
    Array<Piece | null>(8).fill(null)
  );
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: back[c], color: "w" };
  }
  return board;
}

export function initialState(): GameState {
  return {
    board: initialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

// ---------- Attack detection ----------

// Is square `sq` attacked by `color` in the given board?
export function isSquareAttacked(
  board: Board,
  sq: Square,
  byColor: PieceColor
): boolean {
  const { row, col } = sq;

  // Pawn attacks: a pawn of `byColor` attacks diagonally forward.
  // If byColor is white, white pawns are below the square (row+1) attacking up.
  if (byColor === "w") {
    // white pawn attacks upward, so it sits at row+1
    for (const dc of [-1, 1]) {
      const r = row + 1;
      const c = col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === "w" && p.type === "p") return true;
      }
    }
  } else {
    for (const dc of [-1, 1]) {
      const r = row - 1;
      const c = col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === "b" && p.type === "p") return true;
      }
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "n") return true;
    }
  }

  // King attacks (adjacent)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === "k") return true;
      }
    }
  }

  // Sliding: bishop/queen (diagonals)
  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q"))
          return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Sliding: rook/queen (orthogonals)
  const orthDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of orthDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q"))
          return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function findKing(board: Board, color: PieceColor): Square | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king, opposite(color));
}

// ---------- Pseudo-legal move generation ----------

function addPawnMoves(
  state: GameState,
  r: number,
  c: number,
  color: PieceColor,
  moves: Move[]
) {
  const board = state.board;
  const dir = color === "w" ? -1 : 1; // white moves up (decreasing row)
  const startRow = color === "w" ? 6 : 1;
  const promoRow = color === "w" ? 0 : 7;

  const oneR = r + dir;
  if (inBounds(oneR, c) && !board[oneR][c]) {
    if (oneR === promoRow) {
      for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
        moves.push({
          from: { row: r, col: c },
          to: { row: oneR, col: c },
          piece: "p",
          color,
          promotion: promo,
        });
      }
    } else {
      moves.push({ from: { row: r, col: c }, to: { row: oneR, col: c }, piece: "p", color });
      // double push
      if (r === startRow) {
        const twoR = r + 2 * dir;
        if (inBounds(twoR, c) && !board[twoR][c]) {
          moves.push({
            from: { row: r, col: c },
            to: { row: twoR, col: c },
            piece: "p",
            color,
          });
        }
      }
    }
  }

  // captures
  for (const dc of [-1, 1]) {
    const nr = r + dir;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (target && target.color !== color) {
      if (nr === promoRow) {
        for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
          moves.push({
            from: { row: r, col: c },
            to: { row: nr, col: nc },
            piece: "p",
            color,
            captured: target.type,
            promotion: promo,
          });
        }
      } else {
        moves.push({
          from: { row: r, col: c },
          to: { row: nr, col: nc },
          piece: "p",
          color,
          captured: target.type,
        });
      }
    }
    // en passant
    if (
      state.enPassant &&
      state.enPassant.row === nr &&
      state.enPassant.col === nc
    ) {
      moves.push({
        from: { row: r, col: c },
        to: { row: nr, col: nc },
        piece: "p",
        color,
        captured: "p",
        isEnPassant: true,
      });
    }
  }
}

function addSlidingMoves(
  board: Board,
  r: number,
  c: number,
  color: PieceColor,
  type: PieceType,
  dirs: number[][],
  moves: Move[]
) {
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc }, piece: type, color });
      } else {
        if (target.color !== color) {
          moves.push({
            from: { row: r, col: c },
            to: { row: nr, col: nc },
            piece: type,
            color,
            captured: target.type,
          });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function addKnightMoves(
  board: Board,
  r: number,
  c: number,
  color: PieceColor,
  moves: Move[]
) {
  const offsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of offsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (!target) {
      moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc }, piece: "n", color });
    } else if (target.color !== color) {
      moves.push({
        from: { row: r, col: c },
        to: { row: nr, col: nc },
        piece: "n",
        color,
        captured: target.type,
      });
    }
  }
}

function addKingMoves(
  board: Board,
  r: number,
  c: number,
  color: PieceColor,
  moves: Move[]
) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target) {
        moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc }, piece: "k", color });
      } else if (target.color !== color) {
        moves.push({
          from: { row: r, col: c },
          to: { row: nr, col: nc },
          piece: "k",
          color,
          captured: target.type,
        });
      }
    }
  }
}

function addCastlingMoves(state: GameState, color: PieceColor, moves: Move[]) {
  const board = state.board;
  const row = color === "w" ? 7 : 0;
  const enemy = opposite(color);

  // King must be on its square and not in check
  const king = board[row][4];
  if (!king || king.type !== "k" || king.color !== color) return;
  if (isSquareAttacked(board, { row, col: 4 }, enemy)) return;

  const kingside = color === "w" ? state.castling.wK : state.castling.bK;
  const queenside = color === "w" ? state.castling.wQ : state.castling.bQ;

  // King-side
  if (kingside) {
    const rook = board[row][7];
    if (rook && rook.type === "r" && rook.color === color) {
      if (!board[row][5] && !board[row][6]) {
        if (
          !isSquareAttacked(board, { row, col: 5 }, enemy) &&
          !isSquareAttacked(board, { row, col: 6 }, enemy)
        ) {
          moves.push({
            from: { row, col: 4 },
            to: { row, col: 6 },
            piece: "k",
            color,
            isCastle: "k",
          });
        }
      }
    }
  }

  // Queen-side
  if (queenside) {
    const rook = board[row][0];
    if (rook && rook.type === "r" && rook.color === color) {
      if (!board[row][1] && !board[row][2] && !board[row][3]) {
        if (
          !isSquareAttacked(board, { row, col: 3 }, enemy) &&
          !isSquareAttacked(board, { row, col: 2 }, enemy)
        ) {
          moves.push({
            from: { row, col: 4 },
            to: { row, col: 2 },
            piece: "k",
            color,
            isCastle: "q",
          });
        }
      }
    }
  }
}

// Generate all pseudo-legal moves for the side to move
export function generatePseudoLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const board = state.board;
  const color = state.turn;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      switch (p.type) {
        case "p":
          addPawnMoves(state, r, c, color, moves);
          break;
        case "n":
          addKnightMoves(board, r, c, color, moves);
          break;
        case "b":
          addSlidingMoves(
            board,
            r,
            c,
            color,
            "b",
            [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
            ],
            moves
          );
          break;
        case "r":
          addSlidingMoves(
            board,
            r,
            c,
            color,
            "r",
            [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ],
            moves
          );
          break;
        case "q":
          addSlidingMoves(
            board,
            r,
            c,
            color,
            "q",
            [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ],
            moves
          );
          break;
        case "k":
          addKingMoves(board, r, c, color, moves);
          break;
      }
    }
  }

  addCastlingMoves(state, color, moves);
  return moves;
}

// ---------- Apply move (returns new state, does not mutate) ----------

export function applyMove(state: GameState, move: Move): GameState {
  const ns = cloneState(state);
  const board = ns.board;
  const color = move.color;

  // Move the piece
  const piece = board[move.from.row][move.from.col]!;
  board[move.from.row][move.from.col] = null;

  // En passant capture removes the pawn behind
  if (move.isEnPassant) {
    board[move.from.row][move.to.col] = null;
  }

  // Place piece (with promotion)
  board[move.to.row][move.to.col] = move.promotion
    ? { type: move.promotion, color }
    : piece;

  // Castling: move the rook
  if (move.isCastle === "k") {
    const row = move.from.row;
    board[row][5] = board[row][7];
    board[row][7] = null;
  } else if (move.isCastle === "q") {
    const row = move.from.row;
    board[row][3] = board[row][0];
    board[row][0] = null;
  }

  // Update castling rights
  if (piece.type === "k") {
    if (color === "w") {
      ns.castling.wK = false;
      ns.castling.wQ = false;
    } else {
      ns.castling.bK = false;
      ns.castling.bQ = false;
    }
  }
  if (piece.type === "r") {
    if (color === "w") {
      if (move.from.row === 7 && move.from.col === 0) ns.castling.wQ = false;
      if (move.from.row === 7 && move.from.col === 7) ns.castling.wK = false;
    } else {
      if (move.from.row === 0 && move.from.col === 0) ns.castling.bQ = false;
      if (move.from.row === 0 && move.from.col === 7) ns.castling.bK = false;
    }
  }
  // If a rook is captured on its starting square, remove that castling right
  if (move.captured === "r") {
    if (move.to.row === 7 && move.to.col === 0) ns.castling.wQ = false;
    if (move.to.row === 7 && move.to.col === 7) ns.castling.wK = false;
    if (move.to.row === 0 && move.to.col === 0) ns.castling.bQ = false;
    if (move.to.row === 0 && move.to.col === 7) ns.castling.bK = false;
  }

  // En passant target
  ns.enPassant = null;
  if (piece.type === "p" && Math.abs(move.to.row - move.from.row) === 2) {
    ns.enPassant = {
      row: (move.to.row + move.from.row) / 2,
      col: move.from.col,
    };
  }

  // Halfmove clock
  if (piece.type === "p" || move.captured) {
    ns.halfmoveClock = 0;
  } else {
    ns.halfmoveClock = state.halfmoveClock + 1;
  }

  // Fullmove number
  if (color === "b") ns.fullmoveNumber = state.fullmoveNumber + 1;

  ns.turn = opposite(color);
  return ns;
}

// ---------- Legal move generation ----------

export function generateLegalMoves(state: GameState): Move[] {
  const pseudo = generatePseudoLegalMoves(state);
  const legal: Move[] = [];
  for (const move of pseudo) {
    const ns = applyMove(state, move);
    // After applying, it's opponent's turn; we check if OUR king is in check
    if (!isInCheck(ns.board, state.turn)) {
      legal.push(move);
    }
  }
  return legal;
}

export function getLegalMovesFrom(state: GameState, sq: Square): Move[] {
  const all = generateLegalMoves(state);
  return all.filter(
    (m) => m.from.row === sq.row && m.from.col === sq.col
  );
}

// ---------- Game status ----------

export interface StatusResult {
  status: "playing" | "check" | "checkmate" | "stalemate" | "draw";
  winner?: PieceColor;
}

export function getStatus(state: GameState): StatusResult {
  const legal = generateLegalMoves(state);
  const inCheck = isInCheck(state.board, state.turn);

  if (legal.length === 0) {
    if (inCheck) {
      return { status: "checkmate", winner: opposite(state.turn) };
    }
    return { status: "stalemate" };
  }

  if (state.halfmoveClock >= 100) {
    return { status: "draw" };
  }

  // Insufficient material
  if (isInsufficientMaterial(state.board)) {
    return { status: "draw" };
  }

  if (inCheck) return { status: "check" };
  return { status: "playing" };
}

function isInsufficientMaterial(board: Board): boolean {
  const pieces: Piece[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces.push(p);
    }
  }
  // K vs K
  if (pieces.length === 2) return true;
  // K + minor vs K
  if (pieces.length === 3) {
    const nonKings = pieces.filter((p) => p.type !== "k");
    if (nonKings.length === 1 && (nonKings[0].type === "n" || nonKings[0].type === "b"))
      return true;
  }
  return false;
}
