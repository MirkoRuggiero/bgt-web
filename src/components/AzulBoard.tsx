import { useState } from 'react';
import type { AzulState, AzulAction, TileColor, AzulPlayerBoardView } from '../types';

interface AzulBoardProps {
  state: AzulState;
  playerId: string;
  isMyTurn: boolean;
  onAction: (action: AzulAction) => void;
}

const COLOR_MAP: Record<TileColor, { bg: string; border: string; label: string }> = {
  BLUE: { bg: 'bg-blue-500', border: 'border-blue-300', label: 'B' },
  YELLOW: { bg: 'bg-yellow-400', border: 'border-yellow-200', label: 'Y' },
  RED: { bg: 'bg-red-500', border: 'border-red-300', label: 'R' },
  BLACK: { bg: 'bg-gray-800', border: 'border-gray-400', label: 'K' },
  WHITE: { bg: 'bg-gray-100', border: 'border-gray-300', label: 'W' },
};

const WALL_COLORS: TileColor[][] = [
  ['BLUE', 'YELLOW', 'RED', 'BLACK', 'WHITE'],
  ['WHITE', 'BLUE', 'YELLOW', 'RED', 'BLACK'],
  ['BLACK', 'WHITE', 'BLUE', 'YELLOW', 'RED'],
  ['RED', 'BLACK', 'WHITE', 'BLUE', 'YELLOW'],
  ['YELLOW', 'RED', 'BLACK', 'WHITE', 'BLUE'],
];

const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

export function AzulBoard({ state, playerId, isMyTurn, onAction }: AzulBoardProps) {
  const [selectedSource, setSelectedSource] = useState<{ type: 'FACTORY' | 'CENTER'; index: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<TileColor | null>(null);

  const myPlayerIndex = state.playerOrder.indexOf(playerId);
  const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
  const myBoard = state.playerBoards[myPlayerIndex];
  const opponentBoard = state.playerBoards[opponentIndex];

  const handleFactoryClick = (factoryIndex: number) => {
    if (!isMyTurn || !state.isSelectionPhase) return;
    setSelectedSource({ type: 'FACTORY', index: factoryIndex });
    setSelectedColor(null);
  };

  const handleCenterClick = () => {
    if (!isMyTurn || !state.isSelectionPhase) return;
    setSelectedSource({ type: 'CENTER', index: -1 });
    setSelectedColor(null);
  };

  const handleColorSelect = (color: TileColor) => {
    if (!selectedSource) return;
    setSelectedColor(color);
  };

  const handlePatternLineClick = (row: number) => {
    if (!selectedSource || !selectedColor) return;
    onAction({
      sourceType: selectedSource.type,
      factoryIndex: selectedSource.index,
      tileColor: selectedColor,
      targetPatternLine: row,
    });
    setSelectedSource(null);
    setSelectedColor(null);
  };

  const handleFloorClick = () => {
    if (!selectedSource || !selectedColor) return;
    onAction({
      sourceType: selectedSource.type,
      factoryIndex: selectedSource.index,
      tileColor: selectedColor,
      targetPatternLine: -1,
    });
    setSelectedSource(null);
    setSelectedColor(null);
  };

  const getAvailableColors = (): TileColor[] => {
    if (!selectedSource) return [];
    if (selectedSource.type === 'FACTORY') {
      return state.factories[selectedSource.index];
    }
    return state.centerPile;
  };

  const isSourceSelected = (type: 'FACTORY' | 'CENTER', index: number) => {
    return selectedSource?.type === type && selectedSource?.index === index;
  };

  const renderTile = (color: TileColor | null, size: 'sm' | 'md' = 'md') => {
    if (color === null) {
      // First-player token penalty marker
      return (
        <div className={`${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'} rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center text-[8px] text-white font-bold`}>
          FP
        </div>
      );
    }
    const c = COLOR_MAP[color];
    return (
      <div
        className={`${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'} rounded-full ${c.bg} ${c.border} border-2 flex items-center justify-center text-[9px] font-bold ${color === 'WHITE' || color === 'YELLOW' ? 'text-gray-800' : 'text-white'}`}
      >
        {c.label}
      </div>
    );
  };

  const renderPlayerBoard = (board: AzulPlayerBoardView, label: string, isMe: boolean) => {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${isMe ? 'border-2 border-indigo-500' : 'border border-gray-600'}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-semibold text-sm">{label}</h3>
          <span className="text-indigo-300 font-bold">Score: {board.score}</span>
        </div>

        <div className="flex gap-4">
          {/* Pattern Lines (left side) */}
          <div className="flex flex-col gap-1.5">
            {board.patternLines.map((line, row) => {
              const capacity = row + 1;
              const isClickable = isMe && isMyTurn && selectedColor !== null && state.isSelectionPhase;
              return (
                <button
                  key={`pattern-${row}`}
                  onClick={() => isClickable && handlePatternLineClick(row)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-0.5 h-7 px-1 rounded
                    ${isClickable ? 'hover:bg-gray-600 cursor-pointer border border-dashed border-gray-500' : ''}
                    ${!isClickable ? 'cursor-default' : ''}
                  `}
                  title={`Row ${row + 1} (capacity: ${capacity})`}
                >
                  <span className="text-gray-500 text-xs w-4">{row + 1}</span>
                  {Array.from({ length: capacity }).map((_, slot) => {
                    const tile = slot < line.length ? line[slot] : null;
                    return (
                      <div key={slot} className="w-6 h-6 flex items-center justify-center">
                        {tile ? renderTile(tile, 'sm') : (
                          <div className="w-4 h-4 rounded-full border border-dashed border-gray-600" />
                        )}
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>

          {/* Wall (right side) */}
          <div className="grid grid-cols-5 gap-0.5">
            {WALL_COLORS.map((rowColors, row) =>
              rowColors.map((expectedColor, col) => {
                const placedTile = board.wall[row][col];
                return (
                  <div
                    key={`wall-${row}-${col}`}
                    className={`w-6 h-6 rounded-sm border ${
                      placedTile
                        ? `${COLOR_MAP[placedTile].bg} ${COLOR_MAP[placedTile].border} border-2`
                        : 'border-gray-600 bg-gray-700'
                    }`}
                    title={placedTile ? `${placedTile}` : `${expectedColor}`}
                  >
                    {!placedTile && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[6px] text-gray-500">{COLOR_MAP[expectedColor].label}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floor Line */}
        <div className="mt-3">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs mr-1">Floor:</span>
            {Array.from({ length: 7 }).map((_, slot) => {
              const tile = slot < board.floorLine.length ? board.floorLine[slot] : undefined;
              const penalty = FLOOR_PENALTIES[slot];
              return (
                <div key={`floor-${slot}`} className="flex flex-col items-center">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {tile !== undefined ? renderTile(tile, 'sm') : (
                      <div className="w-3 h-3 rounded-full border border-dashed border-gray-600" />
                    )}
                  </div>
                  <span className="text-[8px] text-red-400">{penalty}</span>
                </div>
              );
            })}
            {isMe && isMyTurn && selectedColor !== null && state.isSelectionPhase && (
              <button
                onClick={handleFloorClick}
                className="ml-2 px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded"
              >
                To Floor
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFactories = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Factories</h3>
        <div className="flex flex-wrap gap-3">
          {state.factories.map((factory, idx) => {
            const isEmpty = factory.length === 0;
            const isSelected = isSourceSelected('FACTORY', idx);
            return (
              <button
                key={`factory-${idx}`}
                onClick={() => !isEmpty && handleFactoryClick(idx)}
                disabled={isEmpty || !isMyTurn || !state.isSelectionPhase}
                className={`
                  w-20 h-20 rounded-lg border-2 flex flex-wrap content-start gap-0.5 p-1
                  ${isEmpty ? 'border-gray-700 bg-gray-750 cursor-not-allowed opacity-40' : ''}
                  ${!isEmpty && isSelected ? 'border-indigo-400 bg-indigo-900/30' : ''}
                  ${!isEmpty && !isSelected && isMyTurn && state.isSelectionPhase ? 'border-gray-500 hover:border-indigo-400 cursor-pointer bg-gray-700' : ''}
                  ${!isEmpty && !isMyTurn ? 'border-gray-600 bg-gray-750' : ''}
                `}
              >
                {factory.map((tile, tileIdx) => (
                  <div key={tileIdx} className="w-1/2 flex items-center justify-center">
                    {renderTile(tile, 'sm')}
                  </div>
                ))}
              </button>
            );
          })}
        </div>

        {/* Center Pile */}
        <div className="mt-3">
          <button
            onClick={handleCenterClick}
            disabled={!isMyTurn || !state.isSelectionPhase || (state.centerPile.length === 0 && !state.firstPlayerTokenInCenter)}
            className={`
              inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2
              ${isSourceSelected('CENTER', -1) ? 'border-indigo-400 bg-indigo-900/30' : ''}
              ${isMyTurn && state.isSelectionPhase && (state.centerPile.length > 0 || state.firstPlayerTokenInCenter)
                ? 'border-gray-500 hover:border-indigo-400 cursor-pointer bg-gray-700'
                : 'border-gray-700 bg-gray-750 cursor-not-allowed opacity-60'}
            `}
          >
            <span className="text-gray-400 text-xs mr-1">Center:</span>
            {state.centerPile.map((tile, idx) => (
              <div key={`center-${idx}`}>{renderTile(tile, 'sm')}</div>
            ))}
            {state.firstPlayerTokenInCenter && (
              <div className="w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center text-[6px] text-white font-bold">
                FP
              </div>
            )}
          </button>
        </div>

        {/* Color Selection */}
        {selectedSource && (
          <div className="mt-3">
            <p className="text-gray-400 text-xs mb-2">Select a color to take:</p>
            <div className="flex gap-2">
              {getAvailableColors().filter((c, i, arr) => arr.indexOf(c) === i).map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-8 h-8 rounded-full ${COLOR_MAP[color].bg} border-2 ${COLOR_MAP[color].border}
                    ${selectedColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}
                    hover:scale-110 transition-transform
                  `}
                />
              ))}
            </div>
          </div>
        )}

        {/* Selected color info */}
        {selectedColor && (
          <div className="mt-2 text-indigo-300 text-xs">
            Selected: {selectedColor}. Click a pattern line (1-5) or "To Floor" to place.
          </div>
        )}
      </div>
    );
  };

  // Determine status text
  const isMyTurnInSelection = isMyTurn && state.isSelectionPhase;
  const isOpponentTurn = !isMyTurn && state.isSelectionPhase;

  let statusText = '';
  if (!state.isSelectionPhase) {
    statusText = 'Scoring...';
  } else if (isMyTurnInSelection) {
    statusText = 'Your turn - select tiles';
  } else if (isOpponentTurn) {
    statusText = "Opponent's turn";
  }

  // Result banner
  let resultText = '';
  if (state.gameOver) {
    if (state.winnerId === playerId) {
      resultText = 'You won!';
    } else {
      resultText = 'You lost';
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center px-4 py-6">
      {/* Status bar */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Azul</h1>
        {!state.gameOver && (
          <p className={`text-lg ${isMyTurnInSelection ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}>
            {statusText}
          </p>
        )}
      </div>

      {/* Opponent Board */}
      <div className="w-full max-w-2xl mb-4">
        {renderPlayerBoard(opponentBoard, `Opponent (Player ${opponentIndex + 1})`, false)}
      </div>

      {/* Factories */}
      <div className="w-full max-w-2xl mb-4">
        {renderFactories()}
      </div>

      {/* My Board */}
      <div className="w-full max-w-2xl mb-4">
        {renderPlayerBoard(myBoard, `You (Player ${myPlayerIndex + 1})`, true)}
      </div>

      {/* Result banner */}
      {state.gameOver && (
        <div className="mt-4 text-center">
          <p className={`text-2xl font-bold mb-4 ${
            state.winnerId === playerId ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {resultText}
          </p>
          <p className="text-gray-400 text-sm">
            Final scores: You {myBoard.score} - Opponent {opponentBoard.score}
          </p>
        </div>
      )}
    </div>
  );
}
