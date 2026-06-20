import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStompClient } from '../hooks/useStompClient';
import { useAuth } from '../context/AuthContext';
import type { LobbyUpdateMessage, GameStateMessage, AvailableGameType } from '../types';


export function LobbyPage() {
  const [rooms, setRooms] = useState<LobbyUpdateMessage['openRooms']>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [gameTypes, setGameTypes] = useState<AvailableGameType[]>([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const { subscribe, publish } = useStompClient();
  const { user, logout, credentials } = useAuth();

  const navigate = useNavigate();

  // Fetch available game types
  useEffect(() => {
    if (!credentials) return;

    const token = btoa(`${credentials.username}:${credentials.password}`);

    const fetchGameTypes = async () => {
      try {
        const response = await fetch('/api/lobby/game-types', {
          headers: { Authorization: `Basic ${token}` },
        });
        if (response.ok) {
          const types: AvailableGameType[] = await response.json();
          setGameTypes(types);
        }
      } catch (err) {
        console.error('[GameTypes] Failed to fetch game types:', err);
      }
    };

    fetchGameTypes();
  }, [credentials]);

  // Close create menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Poll for lobby player list updates
  useEffect(() => {
    if (!credentials) return;

    const token = btoa(`${credentials.username}:${credentials.password}`);

    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/lobby/players', {
          headers: { Authorization: `Basic ${token}` },
        });
        if (response.ok) {
          const players: string[] = await response.json();
          setLobbyPlayers(players);
        }
      } catch (err) {
        console.error('[Players] Failed to fetch player list:', err);
      }
    };

    // Fetch immediately
    fetchPlayers();

    // Then poll every 5 seconds
    const interval = setInterval(fetchPlayers, 5000);

    return () => clearInterval(interval);
  }, [credentials]);

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

  // Build a lookup map for game type display names
  const gameTypeDisplayMap = useCallback(() => {
    const map: Record<string, string> = {};
    gameTypes.forEach(gt => {
      map[gt.gameType] = gt.displayName;
    });
    return map;
  }, [gameTypes]);

  const handleCreateGame = useCallback((gameType: string) => {
    console.log(`[LobbyPage] Create game button clicked for ${gameType}`);
    publish('/app/lobby/create', { gameType });
    setShowCreateMenu(false);
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
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Create game
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                {gameTypes.map((gt) => (
                  <button
                    key={gt.gameType}
                    onClick={() => handleCreateGame(gt.gameType)}
                    className="block w-full text-left px-4 py-3 text-gray-200 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <div className="font-medium">{gt.displayName}</div>
                    <div className="text-xs text-gray-500">{gt.minPlayers}-{gt.maxPlayers} players</div>
                  </button>
                ))}
                {gameTypes.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 text-sm">No games available</div>
                )}
              </div>
            )}
          </div>
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
                    Type
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
                {rooms.map((room) => {
                  const displayName = gameTypeDisplayMap()[room.gameType] || room.gameType;
                  return (
                  <tr key={room.sessionId} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-gray-200 font-medium">
                      {room.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs font-medium rounded-full">
                        {displayName}
                      </span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Players in lobby section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Players in Lobby
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({lobbyPlayers.length} online)
            </span>
          </h3>
          {lobbyPlayers.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500">No players in the lobby</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Username
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {lobbyPlayers.map((player, index) => (
                    <tr key={player} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-3 text-gray-200">
                        {player}
                        {player === user?.username && (
                          <span className="ml-2 text-xs text-indigo-400">(you)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
