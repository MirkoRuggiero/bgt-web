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

export interface GameStateMessage {
  sessionId: string;
  gameType: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  state: TicTacToeState;
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

