import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStompClient } from '../hooks/useStompClient';
import { useAuth } from '../context/AuthContext';
import type { LobbyUpdateMessage, GameStateMessage } from '../types';

export function LobbyPage() {
  const [rooms, setRooms] = useState<LobbyUpdateMessage['openRooms']>([]);
  const { subscribe, publish } = useStompClient();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Subscribe to lobby broadcasts (everyone is notified of changes)
  useEffect(() => {
    const unsubLobby = subscribe('/topic/lobby', (msg) => {
      const data: LobbyUpdateMessage = JSON.parse(msg.body);
      setRooms(data.openRooms);
    });

    return () => {
      unsubLobby();
    };
  }, [subscribe]);

  // Subscribe to personal lobby queue for initial state response
  useEffect(() => {
    const unsub = subscribe('/user/queue/lobby', (msg) => {
      const data: LobbyUpdateMessage = JSON.parse(msg.body);
      setRooms(data.openRooms);
    });
    return () => unsub();
  }, [subscribe]);

  // Request the current lobby state on mount
  useEffect(() => {
    publish('/app/lobby/list');
  }, [publish]);

  // Listen for game state on personal queue (creator gets notified when game starts)
  useEffect(() => {
    const unsub = subscribe('/user/queue/game', (msg) => {
      const data: GameStateMessage = JSON.parse(msg.body);
      navigate(`/game/${data.sessionId}`);
    });
    return () => unsub();
  }, [subscribe, navigate]);

  const handleCreateGame = useCallback(() => {
    console.log("[LobbyPage] Create game button clicked");
    publish('/app/lobby/create', { gameType: 'TICTACTOE' });
  }, [publish]);

  const handleJoinGame = useCallback((sessionId: string) => {
    publish(`/app/lobby/join/${sessionId}`);
    // Navigate to game page — the server will send game state on the game topic
    navigate(`/game/${sessionId}`);
  }, [publish, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Board Game Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              Signed in as <span className="text-gray-200 font-medium">{user?.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Game Lobby</h2>
          <button
            onClick={handleCreateGame}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Create game
          </button>
        </div>

        {/* Rooms table */}
        {rooms.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg">No open games</p>
            <p className="text-gray-500 text-sm mt-2">Create a game to get started</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Game
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rooms.map((room) => (
                  <tr key={room.sessionId} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-gray-200 font-medium">
                      {room.name}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {room.creatorName}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <span>{room.currentPlayers} / {room.maxPlayers}</span>
                      {room.playerNames.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({room.playerNames.join(', ')})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleJoinGame(room.sessionId)}
                        disabled={room.currentPlayers >= room.maxPlayers}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                      >
                        {room.currentPlayers >= room.maxPlayers ? 'Full' : 'Join'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
