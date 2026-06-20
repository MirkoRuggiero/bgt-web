import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStompClient } from '../hooks/useStompClient';
import { useAuth } from '../context/AuthContext';
import { TicTacToeBoard } from '../components/TicTacToeBoard';
import { ErrorToast } from '../components/ErrorToast';
import type { GameStateMessage, ErrorMessage, AvailableGameType } from '../types';

const GAME_TITLE_MAP: Record<string, string> = {
  TICTACTOE: 'Tic Tac Toe',
};

export function GamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { subscribe, publish } = useStompClient();
  const { user, credentials } = useAuth();
  const [gameState, setGameState] = useState<GameStateMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState<string>('Game');
  const gameFinishedRef = useRef(false);
  const leftSessionRef = useRef(false);

  // Fetch game title from the API when game state is received
  useEffect(() => {
    if (!gameState?.gameType || !credentials) return;

    const title = GAME_TITLE_MAP[gameState.gameType];
    if (title) {
      setGameTitle(title);
      return;
    }

    const token = btoa(`${credentials.username}:${credentials.password}`);
    fetch('/api/lobby/game-types', {
      headers: { Authorization: `Basic ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then((types: AvailableGameType[] | null) => {
        if (types) {
          const found = types.find(t => t.gameType === gameState.gameType);
          if (found) setGameTitle(found.displayName);
        }
      })
      .catch(() => {});
  }, [gameState?.gameType, credentials]);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to live game broadcasts (sent to all players)
    const unsubGame = subscribe(`/topic/game/${sessionId}`, (msg) => {
      const data: GameStateMessage = JSON.parse(msg.body);
      setGameState(data);

      if (data.status === 'FINISHED') {
        gameFinishedRef.current = true;
      }
    });

    // Subscribe to personal game queue for sync responses
    const unsubSync = subscribe(`/user/queue/game/${sessionId}`, (msg) => {
      const data: GameStateMessage = JSON.parse(msg.body);
      setGameState(data);

      if (data.status === 'FINISHED') {
        gameFinishedRef.current = true;
      }
    });

    const unsubErrors = subscribe('/user/queue/errors', (msg) => {
      const data: ErrorMessage = JSON.parse(msg.body);
      setErrorMessage(data.message);
    });

    // Request current state (handles page refresh / late join)
    publish(`/app/game/${sessionId}/sync`);

    return () => {
      unsubGame();
      unsubSync();
      unsubErrors();
    };
  }, [sessionId, subscribe, publish]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!sessionId) return;
    publish(`/app/game/${sessionId}/action`, { row, col });
  }, [sessionId, publish]);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleBackToLobby = useCallback(() => {
    if (sessionId && !gameFinishedRef.current && !leftSessionRef.current) {
      leftSessionRef.current = true;
      publish(`/app/lobby/leave/${sessionId}`);
    }
    navigate('/lobby');
  }, [sessionId, navigate, publish]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading game...</div>
      </div>
    );
  }

  const tttState = gameState.state;
  const isMyTurn = gameState.currentTurn === user?.id;
  const isPlayerX = user?.id === tttState.playerX;
  const isPlayerO = user?.id === tttState.playerO;

  // Determine if current user is a player in this game
  const isPlayer = isPlayerX || isPlayerO;

  // Derive status text
  let statusText = '';
  if (gameState.status === 'WAITING') {
    statusText = 'Waiting for opponent...';
  } else if (gameState.status === 'IN_PROGRESS') {
    if (!isPlayer) {
      statusText = 'Spectating';
    } else if (isMyTurn) {
      statusText = 'Your turn';
    } else {
      statusText = "Opponent's turn";
    }
  }

  // Result banner
  let resultText = '';
  if (gameState.status === 'FINISHED') {
    if (gameState.isDraw) {
      resultText = "It's a draw!";
    } else if (gameState.winnerId === user?.id) {
      resultText = 'You won!';
    } else if (isPlayer) {
      resultText = 'You lost';
    } else {
      resultText = 'Game finished';
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <ErrorToast message={errorMessage} onDismiss={handleDismissError} />

      {/* Status bar */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">{gameTitle}</h1>
        {gameState.status !== 'FINISHED' && (
          <p className={`text-lg ${isMyTurn && isPlayer ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}>
            {statusText}
          </p>
        )}
      </div>

      {/* Board */}
      <TicTacToeBoard
        state={tttState}
        isMyTurn={isMyTurn && isPlayer}
        onCellClick={handleCellClick}
      />

      {/* Result banner */}
      {gameState.status === 'FINISHED' && (
        <div className="mt-8 text-center">
          <p className={`text-2xl font-bold mb-4 ${
            gameState.isDraw
              ? 'text-yellow-400'
              : gameState.winnerId === user?.id
                ? 'text-emerald-400'
                : 'text-red-400'
          }`}>
            {resultText}
          </p>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to lobby
          </button>
        </div>
      )}

      {/* Back button during game */}
      {gameState.status !== 'FINISHED' && (
        <button
          onClick={handleBackToLobby}
          className="mt-8 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back to lobby
        </button>
      )}
    </div>
  );
}
