export interface User {
  id: string;
  username: string;
}

export type GameSessionStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';

export interface LobbyRoomView {
  sessionId: string;
  gameType: string;
  name: string;
  creatorName: string;
  playerNames: string[];
  currentPlayers: number;
  maxPlayers: number;
  status: GameSessionStatus;
}

export interface LobbyUpdateMessage {
  openRooms: LobbyRoomView[];
}

export interface TicTacToeState {
  board: (string | null)[][];
  currentPlayerId: string;
  playerX: string;
  playerO: string;
  gameOver: boolean;
  winnerId: string | null;
}

// --- Azul Types ---

export type TileColor = 'BLUE' | 'YELLOW' | 'RED' | 'BLACK' | 'WHITE';

export type AzulSourceType = 'FACTORY' | 'CENTER';

export interface AzulPlayerBoardView {
  patternLines: (TileColor | null)[][];
  wall: (TileColor | null)[][];
  floorLine: (TileColor | null)[];
  score: number;
}

export interface AzulState {
  playerOrder: string[];
  currentPlayerIndex: number;
  factories: TileColor[][];
  centerPile: TileColor[];
  firstPlayerTokenInCenter: boolean;
  firstPlayerTokenOwner: string | null;
  playerBoards: AzulPlayerBoardView[];
  isSelectionPhase: boolean;
  gameOver: boolean;
  winnerId: string | null;
  winningScore: number;
}

export interface AzulAction {
  sourceType: AzulSourceType;
  factoryIndex: number;
  tileColor: TileColor;
  targetPatternLine: number;
}

export interface GameStateMessage {
  sessionId: string;
  gameType: string;
  status: GameSessionStatus;
  state: TicTacToeState | AzulState;
  currentTurn: string | null;
  winnerId: string | null;
  isDraw: boolean;
}

export interface ErrorMessage {
  code: string;
  message: string;
}

export interface AuthResponse {
  id: string;
  username: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface GameAction {
  row: number;
  col: number;
}

export interface CreateGameRequest {
  gameType: string;
}

export interface AvailableGameType {
  gameType: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}
